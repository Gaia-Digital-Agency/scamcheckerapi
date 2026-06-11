# File Structure — ScamCheck

Monorepo with a Node API (**the product**), a thin optional Vite SSR React test console, shared code, and optional CMS/Python packages.

> **Deploy target:** `gda-s01` at **`/var/www/scamcheckerapi`** (the repo root below maps to that path on the server).

```
scamcheck/
├── docs/                          # ← these planning docs
│   ├── tech_stack.md
│   ├── architecture.md
│   ├── file_structure.md
│   ├── features.md
│   ├── plan.md
│   └── api_connection.md

│
├── packages/
│   ├── shared/                    # code shared frontend ↔ backend
│   │   ├── phoneValidator.ts      # E.164 validation (single source of truth)
│   │   ├── countryCodes.json      # dial-code table — generates both sides
│   │   └── types.ts               # CheckResponse, ProviderResult, Verdict
│   │
│   ├── api/                       # Node.js backend (Express + TypeScript)
│   │   ├── src/
│   │   │   ├── server.ts          # app bootstrap, middleware, routes
│   │   │   ├── routes/
│   │   │   │   ├── health.ts
│   │   │   │   └── check.ts        # POST /api/v1/check
│   │   │   ├── middleware/
│   │   │   │   ├── apiKey.ts
│   │   │   │   └── rateLimit.ts
│   │   │   ├── providers/         # one adapter per data source
│   │   │   │   ├── index.ts       # registry + priority config
│   │   │   │   ├── ipqs.ts        # PRIMARY
│   │   │   │   ├── numverify.ts
│   │   │   │   ├── abstract.ts
│   │   │   │   └── vonage.ts
│   │   │   ├── providerRouter.ts  # primary→fallback orchestration + merge
│   │   │   ├── scoreEngine.ts     # deterministic verdict rules
│   │   │   ├── cache.ts           # Postgres TTL cache
│   │   │   ├── db/
│   │   │   │   ├── pool.ts        # pg connection
│   │   │   │   └── migrations/    # SQL migrations
│   │   │   │       └── 001_init.sql
│   │   │   └── config.ts          # env loading + validation
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── web/                       # Vite SSR + React + Tailwind frontend
│       ├── src/
│       │   ├── entry-server.tsx   # SSR entry
│       │   ├── entry-client.tsx   # hydration entry
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── PhoneInput.tsx     # live validation + country badge
│       │   │   ├── ResultCard.tsx     # status circle, fields, threat tag
│       │   │   ├── DataSources.tsx    # which APIs answered
│       │   │   ├── History.tsx        # recent checks
│       │   │   └── RawJson.tsx        # debug viewer
│       │   ├── lib/api.ts             # fetch wrapper
│       │   └── styles/index.css       # Tailwind entry
│       ├── server.ts                  # Vite SSR server (prod)
│       ├── index.html
│       ├── tailwind.config.ts
│       ├── vite.config.ts
│       └── package.json
│
├── cms/                           # OPTIONAL — Payload Headless CMS
│   └── (allow/block lists, threat taxonomy, content)
│
├── jobs/                          # OPTIONAL — Python batch/analytics
│   ├── enrich_backfill.py
│   └── requirements.txt
│
├── reference/
│   └── README.md                  # GCP deploy + provider signup guide
│
├── docker-compose.yml             # local Postgres (+ optional CMS)
├── package.json                   # workspace root
└── .gitignore
```

## Notes
- **`packages/shared`** kills the v1 bug where backend and frontend country tables drifted — both import the same `countryCodes.json` + `phoneValidator.ts`.
- **`providers/`** is the only place to touch when adding/removing a data source.
- **`cms/` and `jobs/`** are scaffolded only if/when needed (optional stack items).
- API and web are independent deployables; both can run on the same GCP VM for the MVP.
