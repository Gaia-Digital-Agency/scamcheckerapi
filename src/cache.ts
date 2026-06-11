import { pool } from "./db/pool";
import { config } from "./config";
import type { CheckResponse } from "./shared/types";

export async function getCached(e164: string): Promise<CheckResponse | null> {
  const { rows } = await pool.query(
    "SELECT response FROM lookups WHERE e164 = $1 AND expires_at > now()",
    [e164]
  );
  if (rows.length === 0) return null;
  return rows[0].response as CheckResponse;
}

export async function setCached(e164: string, response: CheckResponse): Promise<void> {
  const ttlMs = config.cacheTtlDays * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + ttlMs);
  await pool.query(
    `INSERT INTO lookups (e164, response, expires_at)
     VALUES ($1, $2, $3)
     ON CONFLICT (e164) DO UPDATE
       SET response = EXCLUDED.response,
           created_at = now(),
           expires_at = EXCLUDED.expires_at`,
    [e164, response, expiresAt]
  );
}

export async function recordHistory(
  e164: string,
  status: string,
  confidence: number,
  sources: string[]
): Promise<void> {
  await pool.query(
    "INSERT INTO history (e164, status, confidence, sources) VALUES ($1, $2, $3, $4)",
    [e164, status, confidence, sources]
  );
}
