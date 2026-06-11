# Architecture — ScamCheck

> **The API is the product.** WordPress (and any other client) calls `POST /api/v1/check`.
> The Vite SSR React UI is a thin, optional test/demo console — not required by consumers.

## High-level flow

```
┌──────────────────────────────────────────────────────────────────┐
│  Client (WordPress / Vite SSR React app / curl)                    │
│     POST /api/v1/check  { number }   header: X-API-Key             │
└───────────────────────────────┬────────────────────────────────────┘
                                 ▼
┌──────────────────────────────────────────────────────────────────┐
│  Node.js API (Express + TS) — GCP Compute Engine :8080             │
│                                                                    │
│  ① auth          X-API-Key check + per-IP rate limit               │
│  ② validate      phoneValidator → E.164 (free local gate)          │
│  ③ cache.get     Postgres TTL cache by e164 (skip if fresh)        │
│  ④ providerRouter  IPQS → numverify/Abstract → Vonage (fallback)   │
│  ⑤ scoreEngine   deterministic rules → status + confidence         │
│  ⑥ persist       write cache + history rows in Postgres            │
│  ⑦ respond       normalized JSON                                   │
└───────────────┬───────────────────────────────┬────────────────────┘
                ▼                                 ▼
        ┌───────────────┐               ┌────────────────────────┐
        │  PostgreSQL    │               │  External fraud APIs    │
        │  cache/history │               │  IPQS · numverify ·     │
        │  keys/limits   │               │  Abstract · Vonage      │
        └───────────────┘               └────────────────────────┘

        Payload CMS (optional) ──▶ allow/block lists, threat taxonomy
        Python jobs (optional) ──▶ batch enrichment / analytics
```

## Components

### 1. API server (Node.js / Express / TypeScript)
Thin HTTP layer: middleware (helmet, CORS allowlist, rate limit, API-key auth), routes (`/health`, `POST /api/v1/check`), error handling. No business logic inline — delegates to the modules below.

### 2. Phone validator (local, free)
Ported from the initial idea. Normalizes raw input (`+`, `00`, spaces/dashes), detects country by longest-prefix dial-code match, validates subscriber-digit length, returns `+E.164` + country metadata. **Runs before any paid/quota'd API call** so malformed numbers never burn quota.

### 3. Provider adapter layer
One module per source (`providers/ipqs.ts`, `numverify.ts`, `abstract.ts`, `vonage.ts`). Each adapter:
- takes an E.164 number,
- calls its API,
- normalizes the response into a **common internal shape** (`ProviderResult`).
Adding/removing a provider = one file + one config entry. Future paid providers (Hiya/SEON) slot in here unchanged.

### 4. Provider router
Calls the **primary** (IPQS); on error or exhausted quota, falls back to secondary providers. Merges results, records which sources answered, and dedupes conflicting fields with a priority order (fraud-grade sources > basic validators).

### 5. Scoring engine (deterministic — no LLM)
Maps merged real signals to a verdict:
- `fraud_score ≥ 85` OR `recent_abuse` OR `spammer` → **UNSAFE**
- `valid && active && fraud_score ≤ 25 && !recent_abuse` → **SAFE**
- otherwise → **UNVERIFIED**

`threat_confidence` is the real provider fraud_score (never invented). Manual overrides from Payload allow/block lists take precedence when present.

### 6. Cache + persistence (PostgreSQL)
- `lookups` — TTL cache keyed by E.164 (default 30-day TTL); repeated checks served from cache to protect tiny free quotas.
- `history` — every check (for the UI's recent-checks list + analytics).
- `api_keys` — issued consumer keys (optional; env key works for MVP).
- `rate_limits` — optional DB-backed counters (in-memory limiter is fine for single-node MVP).

### 7. Frontend (Vite SSR + React + Tailwind)
Server-rendered check console: live client-side validation (shares the validator logic), country badge, result card (status circle, confidence, carrier/line-type fields, threat tag, data-sources row), recent-checks history, raw-JSON viewer. Talks to the API over `fetch`.

### Optional pieces
- **Payload CMS** — admin UI to curate manual allow/block lists, threat-type taxonomy, and any marketing/content pages; backend reads these as scoring overrides.
- **Python** — scheduled batch enrichment, quota-aware backfills, and reporting that are awkward in the request path.

## Deployment topology — `gda-s01`

```
WordPress ──POST https://scamcheckerapi.gaiada.online/api/v1/check {number} + X-API-Key──▶ gda-s01
                                                                       │ :443
                                                          ┌────────────▼─────────────┐
                                                          │ nginx + certbot (HTTPS)   │
                                                          │ scamcheckerapi.gaiada.online
                                                          └────────────┬─────────────┘
                                                                       │ proxy_pass 127.0.0.1:8080
                                                          ┌────────────▼─────────────┐
                                                          │ Node API (PM2)            │
                                                          │ /var/www/scamcheckerapi   │
                                                          └──────┬──────────────┬─────┘
                                                127.0.0.1:5432   │              │ outbound https
                                                   ┌─────────────▼──┐   ┌───────▼──────────┐
                                                   │ Postgres        │   │ IPQS · numverify │
                                                   │ db: scamcheck   │   │ Abstract · Vonage│
                                                   │ (shares instance│   └──────────────────┘
                                                   │  with gaia_nexus)│
                                                   └────────────────┘
```

- **Domain:** `https://scamcheckerapi.gaiada.online` (DNS arranged on GoDaddy → `gda-s01`). API at `/api/v1/check`; optional test UI at `/`.
- **Path:** `/var/www/scamcheckerapi` on `gda-s01`.
- **Process:** PM2 keeps the API alive + on boot; nginx + certbot terminate TLS for `scamcheckerapi.gaiada.online` and proxy to `127.0.0.1:8080`.
- **Database:** reuse the existing Postgres instance on `gda-s01`; create a dedicated `scamcheck` DB (separate from `gaia_nexus`).
- **Secrets:** provider keys live only in `/var/www/scamcheckerapi/packages/api/.env`; WordPress holds only `SCAMCHECK_API_KEY`.

## Key principles
1. **API-first** — the deployable product is the API; the UI is an optional test console.
2. **Deterministic & free** — verdict derived only from real API fields; no LLM cost or hallucination.
3. **Quota survival** — local validation gate + Postgres cache + provider fallback keep usage inside free tiers.
4. **Pluggable providers** — adapter pattern means paid upgrades are drop-in.
5. **Secrets server-side** — provider keys never reach the client; consumers use only `SCAMCHECK_API_KEY`.
