// E.164 validation. Country code is REQUIRED; the leading "+" is optional.
// A bare local number with no recognizable country code is rejected — we never guess.

import { SORTED_CODES } from "./countryCodes";
import type { CountryInfo, ValidationResult } from "./types";

export function isoToFlag(iso: string): string {
  if (!iso || iso.length !== 2) return "🌐";
  return iso
    .toUpperCase()
    .split("")
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

/** Strip formatting and note whether an explicit +/00 country prefix was present. */
function normalise(raw: string): { digitsOnly: string; hasCountryPrefix: boolean } {
  const stripped = raw.trim().replace(/[\s\-.()]/g, "");
  if (stripped.startsWith("+")) {
    return { digitsOnly: stripped.slice(1).replace(/\D/g, ""), hasCountryPrefix: true };
  }
  if (stripped.startsWith("00")) {
    return { digitsOnly: stripped.slice(2).replace(/\D/g, ""), hasCountryPrefix: true };
  }
  return { digitsOnly: stripped.replace(/\D/g, ""), hasCountryPrefix: false };
}

/** Detect country by longest-prefix dial-code match. */
export function detectCountry(digitsOnly: string): CountryInfo | null {
  for (const [code, iso, name, minSub, maxSub] of SORTED_CODES) {
    if (digitsOnly.startsWith(code)) {
      const subscriberLen = digitsOnly.length - code.length;
      return {
        dialCode: code,
        iso2: iso,
        countryName: name,
        flag: isoToFlag(iso),
        subscriberLen,
        minSub,
        maxSub,
        isValid: subscriberLen >= minSub && subscriberLen <= maxSub,
        tooShort: subscriberLen < minSub,
        tooLong: subscriberLen > maxSub,
      };
    }
  }
  return null;
}

const HINT = "Add a country code, e.g. +60 (MY), +65 (SG), +44 (UK), +1 (US).";

export function validatePhone(raw: string): ValidationResult {
  if (!raw || !raw.trim()) {
    return { valid: false, error: "Phone number is required." };
  }

  const { digitsOnly } = normalise(raw);

  if (digitsOnly.length < 4) {
    return { valid: false, error: "Number too short — minimum 4 digits." };
  }

  // Country code is mandatory whether or not "+" was typed: the leading digits
  // must resolve to a known dial code with a valid subscriber length.
  const info = detectCountry(digitsOnly);

  if (!info) {
    return { valid: false, error: `No country code detected. ${HINT}` };
  }
  if (info.tooShort) {
    return {
      valid: false,
      error: `${info.flag} ${info.countryName} (+${info.dialCode}): need ${info.minSub}–${info.maxSub} digits after the country code, got ${info.subscriberLen}.`,
      country: info,
    };
  }
  if (info.tooLong) {
    return {
      valid: false,
      error: `${info.flag} ${info.countryName} (+${info.dialCode}): too many digits — max ${info.maxSub} after the country code, got ${info.subscriberLen}.`,
      country: info,
    };
  }

  return { valid: true, e164: `+${digitsOnly}`, country: info };
}
