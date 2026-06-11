// numverify (apilayer) — fallback validator. Free tier: 100 req/mo.
// Provides validity, country, carrier, line type. No fraud score.
import { getJson, clean, normLineType } from "./http";
import type { ProviderResult } from "../shared/types";

export async function lookupNumverify(e164: string, apiKey: string): Promise<ProviderResult> {
  const src = "numverify";
  try {
    const number = encodeURIComponent(e164.replace(/^\+/, ""));
    const url = `https://apilayer.net/api/validate?access_key=${apiKey}&number=${number}`;
    const d = await getJson(url);

    if (d.success === false) {
      return { source: src, ok: false, error: d.error?.info || "numverify request failed", raw: d };
    }

    return {
      source: src,
      ok: true,
      valid: Boolean(d.valid),
      carrier: clean(d.carrier),
      lineType: normLineType(d.line_type),
      country: clean(d.country_name),
      raw: d,
    };
  } catch (err: any) {
    return { source: src, ok: false, error: err.message };
  }
}
