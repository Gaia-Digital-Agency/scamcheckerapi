# Tech Stack — ScamCheck

**The product is a phone-number fraud-intelligence API** that WordPress (and other clients) consume. Verdicts come from **real fraud/telco APIs** and a **deterministic scoring engine** — no LLM, no Anthropic/Claude. The web UI is a thin, secondary test/demo console — not the deliverable.

## Core stack (preferred defaults)

| Layer | Choice | Notes |
|---|---|---|
| **Database** | **PostgreSQL** | Lookup cache, check history, API keys, rate-limit counters |
| **Backend** | **Node.js** (Express + TypeScript) | API server, provider adapters, scoring engine |
| **Frontend** | **Vite SSR + React + Tailwind CSS** | Check console UI + result cards |
| **CMS** | **Payload Headless CMS** *(optional)* | Manage threat taxonomy, manual allow/block lists, content pages |
| **Scripting** | **Python** *(optional)* | Batch enrichment, data backfills, analytics jobs |

## External data providers (MVP = free tiers only)

| Provider | Role | Free tier | Signals used |
|---|---|---|---|
| **IPQualityScore (IPQS)** | **Primary** | 1,000 lookups/mo, no card | fraud_score, recent_abuse, risky, spammer, active, carrier, line_type |
| **numverify** | Fallback / cross-check | 100 req/mo | valid, country, carrier, line_type |
| **AbstractAPI Phone** | Alt fallback | 100 req/mo | valid, carrier, line_type, location |
| **Vonage Number Insight v2** | Optional | Trial credit | fraud score, **SIM-swap** detection |

**Excluded from MVP** (no free self-serve API): Hiya (sales-gated, paid), Truecaller (no official API), Whoscall/Gogolook (no public API), SEON (trial/sales-gated). All are documented as future paid upgrades — the provider-adapter layer makes them drop-in.

## Supporting libraries

- **Validation:** local E.164 validator (ported from initial idea) — free gate before any API call
- **HTTP/server:** Express, helmet, cors, express-rate-limit, morgan
- **DB access:** `pg` + a light query layer (or Drizzle ORM)
- **Cache:** Postgres-backed TTL cache (protects small free quotas)
- **Auth:** `X-API-Key` header (own key, shared with consumers e.g. WordPress)
- **Frontend data:** native `fetch`; Tailwind for styling

## Explicitly NOT used

- ❌ Anthropic / Claude / any LLM — verdict is 100% deterministic from real API fields
- ❌ Truecaller / Whoscall unofficial scrapers (ToS + reliability risk)

## Runtime / deploy

- **Server:** `gda-s01` (GCP Compute Engine), deployed under **`/var/www/scamcheckerapi`**
- **Domain:** `https://scamcheckerapi.gaiada.online` (GoDaddy DNS → `gda-s01`); API at `/api/v1/check`, optional test UI at `/`
- **Process:** Node 20 under PM2; API on `127.0.0.1:8090` behind nginx + certbot (HTTPS). (Port 8090 — 8080 was already in use on the host.)
- **Database:** reuse the existing Postgres on `gda-s01` (`127.0.0.1:5432`) with a **dedicated `scamcheck` database** (separate from `gaia_nexus`)
- **Env:** `.env` for provider keys + `SCAMCHECK_API_KEY` + Postgres connection + `ALLOWED_ORIGINS`
