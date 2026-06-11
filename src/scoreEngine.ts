// Deterministic verdict from real provider signals. No LLM.

import type { CheckResult, LineType, Status } from "./shared/types";
import type { MergedData } from "./providerRouter";

const SOURCE_LABELS: Record<string, string> = {
  ipqs: "IPQualityScore",
  numverify: "numverify",
  abstract: "AbstractAPI",
};

export function score(merged: MergedData, fallbackCountry: string | null): CheckResult {
  // Date of information in GMT+8 (Asia/Singapore — no DST).
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Singapore" });
  const hasData = merged.sources.length > 0;

  const fraudScore = merged.fraudScore;
  const hasFraudSignal = typeof fraudScore === "number";

  let status: Status;
  let threatType: string | null = null;
  let notes: string;

  if (!hasData) {
    status = "UNVERIFIED";
    notes = "No data sources were available for this number.";
  } else if (merged.spammer || merged.recentAbuse || (hasFraudSignal && fraudScore! >= 85)) {
    status = "UNSAFE";
    threatType = merged.spammer ? "spam" : merged.recentAbuse ? "reported_abuse" : "high_risk";
    notes = "Credible fraud/abuse signals were reported for this number.";
  } else if (
    merged.valid === true &&
    merged.active !== false &&
    hasFraudSignal &&
    fraudScore! <= 25 &&
    !merged.recentAbuse
  ) {
    status = "SAFE";
    notes = "No fraud reports found; number appears valid and active.";
  } else {
    status = "UNVERIFIED";
    notes = hasFraudSignal
      ? "Some risk indicators are inconclusive; insufficient evidence for a firm verdict."
      : "Carrier/line data available, but no fraud-scoring source confirmed this number.";
  }

  const lineType: LineType = merged.lineType ?? "unknown";

  return {
    status,
    country: merged.country ?? fallbackCountry,
    name_attached: merged.nameAttached ?? null,
    date_of_information: today,
    threat_confidence: hasFraudSignal ? Math.round(fraudScore!) : 0,
    carrier: merged.carrier ?? null,
    line_type: lineType,
    threat_type: threatType,
    notes,
    data_sources: merged.sources.map((s) => SOURCE_LABELS[s] || s),
  };
}
