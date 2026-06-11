// AbstractAPI Phone Validation — alt fallback validator. Free tier: 100 req/mo.
// Provides validity, carrier, line type, location. No fraud score.
import { getJson, clean, normLineType } from "./http";
import type { ProviderResult } from "../shared/types";

export async function lookupAbstract(e164: string, apiKey: string): Promise<ProviderResult> {
  const src = "abstract";
  try {
    const phone = encodeURIComponent(e164.replace(/^\+/, ""));
    const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${apiKey}&phone=${phone}`;
    const d = await getJson(url);

    return {
      source: src,
      ok: true,
      valid: Boolean(d.valid),
      carrier: clean(d.carrier),
      lineType: normLineType(d.type),
      country: clean(d.country?.name),
      raw: d,
    };
  } catch (err: any) {
    return { source: src, ok: false, error: err.message };
  }
}
