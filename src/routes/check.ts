import { Router } from "express";
import { validatePhone } from "../shared/phoneValidator";
import { COUNTRY_CODES } from "../shared/countryCodes";
import { runProviders } from "../providerRouter";
import { score } from "../scoreEngine";
import { getCached, setCached, recordHistory } from "../cache";
import { requireApiKey } from "../middleware/apiKey";
import type { CheckResponse } from "../shared/types";

export const checkRouter = Router();

// Expose the dial-code table so the frontend validates with the same data.
checkRouter.get("/api/v1/meta/countries", (_req, res) => {
  res.json(
    COUNTRY_CODES.map(([dial_code, iso2, name, min, max]) => ({
      dial_code,
      iso2,
      name,
      min,
      max,
    }))
  );
});

checkRouter.post("/api/v1/check", requireApiKey, async (req, res) => {
  try {
    const number = req.body?.number;
    if (typeof number !== "string") {
      return res.status(422).json({ success: false, error: "Body must include a string 'number'." });
    }

    const v = validatePhone(number);
    if (!v.valid || !v.e164 || !v.country) {
      return res.status(422).json({ success: false, error: v.error, country: v.country ?? null });
    }

    // Cache hit?
    const cached = await getCached(v.e164);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    const { merged } = await runProviders(v.e164, v.country.iso2);
    const result = score(merged, v.country.countryName);

    const response: CheckResponse = {
      success: true,
      input: { raw: number, e164: v.e164 },
      country_detected: {
        name: v.country.countryName,
        iso2: v.country.iso2,
        flag: v.country.flag,
        dial_code: v.country.dialCode,
      },
      result,
      cached: false,
    };

    await setCached(v.e164, response);
    await recordHistory(v.e164, result.status, result.threat_confidence, result.data_sources);

    return res.json(response);
  } catch (err: any) {
    console.error("check error:", err.message);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});
