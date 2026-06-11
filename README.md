# ScamCheck API

Phone-number fraud-intelligence API. Verdicts come from real data providers
(IPQualityScore primary; numverify / AbstractAPI fallback) and a deterministic
scoring engine — **no LLM**. Deployed on `gda-s01` at `/var/www/scamcheckerapi`,
served at `https://scamcheckerapi.gaiada.online`.

See [`docs/`](./docs) for full architecture, plan, and the API connection guide.

## Quick start (server)

```bash
cp .env.example .env   # fill in SCAMCHECK_API_KEY, DATABASE_URL, IPQS_API_KEY
npm install
npm run build
npm run migrate
pm2 start ecosystem.config.js
```

## Endpoints
- `GET /health`
- `POST /api/v1/check`  (header `X-API-Key`, body `{ "number": "+60123456789" }`)
- `GET /api/v1/meta/countries`
- `GET /` — plain test console

Full request/response schema + WordPress examples: [`docs/api_connection.md`](./docs/api_connection.md).
