// Idempotent schema setup. Run with: npm run migrate
import { pool } from "./pool";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS lookups (
  e164         TEXT PRIMARY KEY,
  response     JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at   TIMESTAMPTZ NOT NULL
);
CREATE INDEX IF NOT EXISTS lookups_expires_at_idx ON lookups (expires_at);

CREATE TABLE IF NOT EXISTS history (
  id           BIGSERIAL PRIMARY KEY,
  e164         TEXT NOT NULL,
  status       TEXT NOT NULL,
  confidence   INTEGER,
  sources      TEXT[],
  checked_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS history_e164_idx ON history (e164);
CREATE INDEX IF NOT EXISTS history_checked_at_idx ON history (checked_at DESC);
`;

async function main() {
  await pool.query(SCHEMA);
  console.log("Migrations applied.");
  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
