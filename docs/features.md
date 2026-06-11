# Features — ScamCheck

## MVP (must-have)

### Phone number check
- [ ] Accept a number with `+` optional, but **country code required** (`+60123456789`, `0060…`, `60123456789` all OK)
- [ ] Strip formatting (spaces, dashes, brackets, `+`/`00` prefixes)
- [ ] Resolve country by longest-prefix match against the 220-code table
- [ ] **Digit pre-check**: subscriber length must fall within that country's min–max — runs client-side **before** any API call (saves quota)
- [ ] **No country code → reject** (CHECK disabled + hint to add one). App never guesses the country from a bare local number.
- [ ] Normalize to E.164
- [ ] Return verdict: **SAFE / UNSAFE / UNVERIFIED**

### Real-data intelligence (no LLM)
- [ ] **IPQS primary lookup** — fraud_score, recent_abuse, spammer/risky flags, active, carrier, line_type
- [ ] **Fallback providers** — numverify / AbstractAPI when IPQS errors or quota is hit
- [ ] **Deterministic scoring engine** maps real signals → verdict + confidence (confidence = real fraud_score, never invented)
- [ ] Response shows **which data sources answered**

### Caching & quota protection
- [ ] Postgres TTL cache keyed by E.164 (default 30 days) — repeat checks don't burn quota
- [ ] Provider fallback chain so one exhausted free tier doesn't break the service

### API
- [ ] `GET /health` — no auth, for uptime checks
- [ ] `POST /api/v1/check` — `X-API-Key` auth, JSON `{ number }`
- [ ] Per-IP rate limiting
- [ ] CORS allowlist for known consumer origins
- [ ] Provider keys kept server-side only

### Frontend — simple test/demo UI (secondary to the API)
> The **API is the product**; this UI is a thin MVP console for testing and demos. WordPress consumes the API directly, not this UI.
- [ ] Single number input, `+` optional, CHECK disabled until country code resolves + digit-check passes
- [ ] Inline validation hint (✓ ready / "add a country code" / "need X–Y digits")
- [ ] Result card showing exactly: **status (SAFE/UNSAFE/UNVERIFIED)**, **country**, **name attached**, **date of information**, **other info** (carrier · line type · threat type · sources)

## Phase 2 (should-have)
- [ ] Persisted check history + simple stats dashboard
- [ ] DB-backed API keys (multiple consumers, per-key limits)
- [ ] Manual allow/block lists (override scoring)
- [ ] Vonage Number Insight: SIM-swap detection signal
- [ ] WordPress integration helper (PHP snippet + JS fetch) documented & tested

## Phase 3 (nice-to-have / paid upgrades)
- [ ] **Payload CMS** admin for threat taxonomy, allow/block lists, content pages
- [ ] **Python jobs** for batch enrichment + scheduled reporting
- [ ] Paid provider adapters: **Hiya** (reputation), **SEON** (digital footprint) — drop-in via adapter layer
- [ ] Bulk CSV check endpoint
- [ ] Webhooks / alerting on UNSAFE hits
- [ ] Per-consumer analytics & billing

## Explicitly out of scope
- ❌ Any LLM / Anthropic / Claude in the verdict path
- ❌ Truecaller / Whoscall unofficial scrapers (no legitimate API; ToS + reliability risk)
