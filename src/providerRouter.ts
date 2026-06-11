// Orchestrates providers: IPQS primary, numverify/abstract as fallback.
// Fallbacks are only called when the primary is unavailable/failed, to protect
// the small free quotas. Results are merged with a priority order.

import { config } from "./config";
import { lookupIpqs } from "./providers/ipqs";
import { lookupNumverify } from "./providers/numverify";
import { lookupAbstract } from "./providers/abstract";
import type { LineType, ProviderResult } from "./shared/types";

export interface MergedData {
  valid?: boolean;
  active?: boolean;
  fraudScore?: number;
  recentAbuse?: boolean;
  spammer?: boolean;
  risky?: boolean;
  carrier: string | null;
  lineType: LineType | null;
  country: string | null;
  nameAttached: string | null;
  sources: string[];
}

function firstNonNull<T>(results: ProviderResult[], pick: (r: ProviderResult) => T | null | undefined): T | null {
  for (const r of results) {
    const v = pick(r);
    if (v !== null && v !== undefined) return v;
  }
  return null;
}

export async function runProviders(e164: string, iso2?: string): Promise<{
  results: ProviderResult[];
  merged: MergedData;
}> {
  const results: ProviderResult[] = [];

  // Primary: IPQS (the only free source with a real fraud score).
  let primaryOk = false;
  if (config.providers.ipqs) {
    const r = await lookupIpqs(e164, config.providers.ipqs, iso2);
    results.push(r);
    primaryOk = r.ok;
  }

  // Fallback only if primary is missing/failed — preserves tiny free quotas.
  if (!primaryOk && config.providers.numverify) {
    const r = await lookupNumverify(e164, config.providers.numverify);
    results.push(r);
    if (r.ok) primaryOk = true;
  }
  if (!primaryOk && config.providers.abstract) {
    const r = await lookupAbstract(e164, config.providers.abstract);
    results.push(r);
  }

  const ok = results.filter((r) => r.ok);

  const merged: MergedData = {
    valid: firstNonNull(ok, (r) => r.valid) ?? undefined,
    active: firstNonNull(ok, (r) => r.active) ?? undefined,
    fraudScore: firstNonNull(ok, (r) => r.fraudScore) ?? undefined,
    recentAbuse: firstNonNull(ok, (r) => r.recentAbuse) ?? undefined,
    spammer: firstNonNull(ok, (r) => r.spammer) ?? undefined,
    risky: firstNonNull(ok, (r) => r.risky) ?? undefined,
    carrier: firstNonNull(ok, (r) => r.carrier),
    lineType: firstNonNull(ok, (r) => r.lineType),
    country: firstNonNull(ok, (r) => r.country),
    nameAttached: firstNonNull(ok, (r) => r.nameAttached),
    sources: ok.map((r) => r.source),
  };

  return { results, merged };
}
