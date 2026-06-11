# Build Plan — ScamCheck

Goal: rebuild the initial-idea phone fraud checker on the preferred stack
(PostgreSQL + Node.js API + Vite SSR/React/Tailwind), using **real fraud APIs**
and a **deterministic scoring engine** — **no LLM / no Anthropic**. MVP runs on
**free API tiers only**; deploys to **GCP Compute Engine**.

## Milestone 0 — Project setup
1. Init workspace monorepo (`packages/shared`, `packages/api`, `packages/web`).
2. `docker-compose.yml` with local Postgres.
3. TypeScript + linting config; `.env.example` for both packages.
4. Sign up for free API keys: **IPQS** (primary), **numverify**, **AbstractAPI**. (Vonage trial optional.)

## Milestone 1 — Shared core
1. Port `phoneValidator` + `countryCodes.json` into `packages/shared` (single source of truth — fixes v1 table drift).
2. Define shared types: `ProviderResult`, `Verdict`, `CheckResponse`.
3. Unit tests for validator (E.164 edge cases, country inference).

## Milestone 2 — Provider layer
1. `providers/ipqs.ts` — primary; normalize fraud_score/flags/carrier/line_type.
2. `providers/numverify.ts`, `providers/abstract.ts` — fallback validators.
3. `providers/vonage.ts` — optional (SIM-swap + fraud score).
4. `providers/index.ts` — registry + priority/config.
5. `providerRouter.ts` — primary→fallback orchestration, merge, source tracking.
6. Mock each provider's HTTP in tests (no live calls in CI).

## Milestone 3 — Scoring + persistence
1. `scoreEngine.ts` — deterministic rules → SAFE / UNSAFE / UNVERIFIED + confidence.
2. Postgres migrations: `lookups` (TTL cache), `history`, (optional) `api_keys`, `rate_limits`.
3. `cache.ts` — read-through cache keyed by E.164.
4. Tests for scoring thresholds and cache hit/miss.

## Milestone 4 — API server
1. Express bootstrap: helmet, CORS allowlist, rate limit, `X-API-Key` auth.
2. `GET /health`, `POST /api/v1/check` wiring validate → cache → router → score → persist → respond.
3. Structured error responses (422 validation, 401 auth, 429 rate limit, 5xx provider).
4. Integration tests against mocked providers.

## Milestone 5 — Frontend (Vite SSR + React + Tailwind)
1. SSR scaffold (entry-server/entry-client, Vite SSR server).
2. Components: `PhoneInput` (live validation + badge), `ResultCard`, `DataSources`, `History`, `RawJson`, config bar.
3. Tailwind styling matching the dark "console" look from the initial idea.
4. Wire to API via `lib/api.ts`.

## Milestone 6 — Deploy (`gda-s01`)
1. Deploy to **`/var/www/scamcheckerapi`** on `gda-s01`: Node 18+, install deps, build.
2. Create dedicated `scamcheck` Postgres DB on the existing instance; run migrations.
3. PM2 for API (+ optional SSR server) on `127.0.0.1:8090`.
4. nginx vhost for **`scamcheckerapi.gaiada.online`** (DNS already set on GoDaddy) → proxy to `:8090`; **certbot** for HTTPS.
5. API live at `https://scamcheckerapi.gaiada.online/api/v1/check`; test UI at the root.
6. `reference/README.md`: deploy steps + provider signup links + WordPress integration snippet.

## Milestone 7 — Optional (deferred)
- **Payload CMS** for allow/block lists + threat taxonomy (scoring overrides).
- **Python jobs** for batch enrichment / reporting.
- Paid provider adapters: **Hiya**, **SEON** (drop-in).
- Bulk CSV endpoint, webhooks/alerting, per-consumer analytics.

## Risks & mitigations
| Risk | Mitigation |
|---|---|
| Tiny free quotas (numverify/Abstract 100/mo) | Local validation gate + Postgres cache + IPQS primary (1,000/mo) |
| Provider outage / quota exhausted | Fallback chain; degrade to UNVERIFIED with sources noted |
| Listed providers not actually free (Hiya/Truecaller/Whoscall) | Excluded from MVP; documented as paid/future via adapter layer |
| Verdict accuracy for unknown numbers | Honest UNVERIFIED; confidence = real fraud_score, never fabricated |

## Definition of done (MVP)
- A number entered in the web console returns a real, cached, deterministically-scored verdict with visible data sources, served by the GCP-hosted API — with zero LLM involvement and within free API tiers.
