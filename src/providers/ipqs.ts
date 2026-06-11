// IPQualityScore — primary source. Free tier: 1,000 lookups/mo.
// Docs: https://www.ipqualityscore.com/documentation/phone-number-validation-api/overview
import { getJson, clean, normLineType } from "./http";
import type { ProviderResult } from "../shared/types";

export async function lookupIpqs(
  e164: string,
  apiKey: string,
  iso2?: string
): Promise<ProviderResult> {
  const src = "ipqs";
  try {
    const phone = encodeURIComponent(e164);
    const country = iso2 ? `?country[]=${encodeURIComponent(iso2)}` : "";
    const url = `https://ipqualityscore.com/api/json/phone/${apiKey}/${phone}${country}`;
    const d = await getJson(url);

    if (d.success === false) {
      return { source: src, ok: false, error: d.message || "IPQS request failed", raw: d };
    }

    return {
      source: src,
      ok: true,
      valid: Boolean(d.valid),
      active: Boolean(d.active),
      fraudScore: typeof d.fraud_score === "number" ? d.fraud_score : undefined,
      recentAbuse: Boolean(d.recent_abuse),
      spammer: Boolean(d.spammer),
      risky: Boolean(d.risky),
      carrier: clean(d.carrier),
      lineType: normLineType(d.line_type),
      country: clean(d.country),
      nameAttached: clean(d.name),
      raw: d,
    };
  } catch (err: any) {
    return { source: src, ok: false, error: err.message };
  }
}
