# API Connection Guide — ScamCheck

How to connect to and consume the ScamCheck API (e.g. from WordPress).

- **Base URL:** `https://scamcheckerapi.gaiada.online`
- **Auth:** every protected call sends an `X-API-Key` header (your `SCAMCHECK_API_KEY`)
- **Content type:** `application/json`
- **Verdict source:** real fraud/telco APIs + deterministic scoring — no LLM

---

## Authentication

All `/api/v1/*` endpoints require a header:

```
X-API-Key: <YOUR_SCAMCHECK_API_KEY>
```

- The key is your own shared secret (not a provider key). It is issued server-side and stored only on the server and in the consumer (e.g. WordPress option).
- Missing/invalid key → `401`.
- Provider keys (IPQS, numverify, …) live only on the server and are **never** exposed to clients.

---

## Endpoints

### `GET /health`
No auth. For uptime checks.

```
GET https://scamcheckerapi.gaiada.online/health
→ 200 { "status": "ok", "service": "scamcheck-api", "version": "1.0.0" }
```

### `POST /api/v1/check`
Check a single phone number.

**Request**
```http
POST /api/v1/check
Host: scamcheckerapi.gaiada.online
Content-Type: application/json
X-API-Key: YOUR_SCAMCHECK_API_KEY

{ "number": "+60123456789" }
```

**Number rules**
- `+` is optional, but a **country code is required** (`+60123456789`, `0060123456789`, `60123456789` all accepted).
- Spaces, dashes, brackets are stripped automatically.
- A bare local number with no country code (e.g. `0123456789`) is **rejected** (`422`) — the API does not guess the country.

**Success — `200`**
```json
{
  "success": true,
  "input": {
    "raw": "+60123456789",
    "e164": "+60123456789"
  },
  "country_detected": {
    "name": "Malaysia",
    "iso2": "MY",
    "flag": "🇲🇾",
    "dial_code": "60"
  },
  "result": {
    "status": "SAFE | UNSAFE | UNVERIFIED",
    "country": "Malaysia",
    "name_attached": null,
    "date_of_information": "2026-06-11",
    "threat_confidence": 92,
    "carrier": "Maxis",
    "line_type": "mobile",
    "threat_type": "investment_scam",
    "notes": "Number has recent public abuse reports.",
    "data_sources": ["IPQualityScore"]
  },
  "cached": false
}
```

**Field notes**
| Field | Meaning |
|---|---|
| `status` | `SAFE` (no fraud signal), `UNSAFE` (credible fraud signal), `UNVERIFIED` (insufficient data) |
| `country` | Resolved from the country code |
| `name_attached` | Public name if any provider returns one. **Usually `null`** on free tiers |
| `date_of_information` | When the data was fetched / last refreshed (cache date) |
| `threat_confidence` | Real provider fraud score 0–100 (never fabricated) |
| `carrier`, `line_type`, `threat_type` | "Other information" — from provider data |
| `data_sources` | Which real APIs answered |
| `cached` | `true` if served from the server-side cache |

---

## Error responses

| Status | Meaning | Body |
|---|---|---|
| `422` | Invalid number / no country code | `{ "success": false, "error": "..." }` |
| `401` | Missing/invalid `X-API-Key` | `{ "error": "Unauthorised..." }` |
| `429` | Rate limit exceeded | `{ "error": "Too many requests..." }` |
| `5xx` | Provider/server error | `{ "success": false, "error": "..." }` |

Validation example:
```json
{ "success": false, "error": "🇲🇾 Malaysia (+60): need 7–10 digits after country code, got 4." }
```

---

## Rate limits & caching

- Per-IP rate limit (default 60 requests / 15 min) — honour `429` with backoff.
- The server caches results per number (Postgres, ~30-day TTL) to stay inside free provider quotas.
- **Consumers should also cache** (e.g. WordPress transients) so repeated lookups of the same number don't hit the API at all.

---

## WordPress integration

### Option A — PHP (`wp_remote_post`) with transient cache
```php
function scamcheck_number( $phone ) {
    $cache_key = 'scamcheck_' . md5( $phone );
    $cached = get_transient( $cache_key );
    if ( $cached !== false ) return $cached;

    $response = wp_remote_post( 'https://scamcheckerapi.gaiada.online/api/v1/check', [
        'headers' => [
            'Content-Type' => 'application/json',
            'X-API-Key'    => get_option( 'scamcheck_api_key' ),
        ],
        'body'    => wp_json_encode( [ 'number' => $phone ] ),
        'timeout' => 30,
    ] );

    if ( is_wp_error( $response ) ) return null;

    $data = json_decode( wp_remote_retrieve_body( $response ), true );
    if ( empty( $data['success'] ) ) return null;

    // cache for 7 days
    set_transient( $cache_key, $data['result'], 7 * DAY_IN_SECONDS );
    return $data['result'];
}

// Usage
$result = scamcheck_number( '+60123456789' );
echo $result['status']; // SAFE | UNSAFE | UNVERIFIED
```

### Option B — JavaScript `fetch` (front end)
> Only expose the key to the browser if the endpoint/key is locked down. Prefer proxying through PHP (Option A) for public sites.
```javascript
async function checkScam(number) {
  const res = await fetch('https://scamcheckerapi.gaiada.online/api/v1/check', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': scamcheckConfig.apiKey, // injected via wp_localize_script
    },
    body: JSON.stringify({ number }),
  });
  return res.json();
}
```

---

## Quick test (curl)

```bash
# Health
curl https://scamcheckerapi.gaiada.online/health

# Check
curl -X POST https://scamcheckerapi.gaiada.online/api/v1/check \
  -H "Content-Type: application/json" \
  -H "X-API-Key: YOUR_SCAMCHECK_API_KEY" \
  -d '{"number":"+60123456789"}'
```

---

## CORS

Browser calls are allowed only from origins listed in the server's `ALLOWED_ORIGINS` env (e.g. your WordPress domain). Server-to-server calls (PHP, curl) are unaffected.
