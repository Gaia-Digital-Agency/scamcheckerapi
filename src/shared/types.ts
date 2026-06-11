// Shared types used across validation, providers, scoring, and the API response.

export type Status = "SAFE" | "UNSAFE" | "UNVERIFIED";

export type LineType = "mobile" | "landline" | "voip" | "unknown";

export interface CountryInfo {
  dialCode: string;
  iso2: string;
  countryName: string;
  flag: string;
  subscriberLen: number;
  minSub: number;
  maxSub: number;
  isValid: boolean;
  tooShort: boolean;
  tooLong: boolean;
}

export interface ValidationResult {
  valid: boolean;
  e164?: string;
  error?: string;
  country?: CountryInfo;
}

/** Normalized shape every provider adapter returns. */
export interface ProviderResult {
  source: string;
  ok: boolean;            // adapter ran without error
  valid?: boolean;        // provider thinks the number is a real, assignable number
  active?: boolean;       // line currently active/reachable
  fraudScore?: number;    // 0-100
  recentAbuse?: boolean;
  spammer?: boolean;
  risky?: boolean;
  carrier?: string | null;
  lineType?: LineType | null;
  country?: string | null;
  nameAttached?: string | null;
  error?: string;
  raw?: unknown;          // original payload (kept for debugging, not returned to clients)
}

export interface CheckResult {
  status: Status;
  country: string | null;
  name_attached: string | null;
  date_of_information: string;   // YYYY-MM-DD
  threat_confidence: number;     // real provider fraud score 0-100
  carrier: string | null;
  line_type: LineType;
  threat_type: string | null;
  notes: string;
  data_sources: string[];
}

export interface CheckResponse {
  success: boolean;
  input: { raw: string; e164: string };
  country_detected: {
    name: string;
    iso2: string;
    flag: string;
    dial_code: string;
  } | null;
  result: CheckResult;
  cached: boolean;
}
