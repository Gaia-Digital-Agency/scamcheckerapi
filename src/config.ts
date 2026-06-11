import "dotenv/config";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing required env var: ${name}`);
  return v;
}

export const config = {
  port: Number(process.env.PORT || 8080),
  host: process.env.HOST || "127.0.0.1",
  // Primary key — also the one pre-filled on the public test page.
  scamcheckApiKey: required("SCAMCHECK_API_KEY"),
  // All accepted keys: primary + any extras in SCAMCHECK_API_KEYS (comma-separated, e.g. the WordPress key).
  scamcheckApiKeys: Array.from(
    new Set([
      required("SCAMCHECK_API_KEY"),
      ...(process.env.SCAMCHECK_API_KEYS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ])
  ),
  databaseUrl: required("DATABASE_URL"),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  cacheTtlDays: Number(process.env.CACHE_TTL_DAYS || 30),
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX || 60),
  rateLimitWindowMin: Number(process.env.RATE_LIMIT_WINDOW_MIN || 15),
  providers: {
    ipqs: process.env.IPQS_API_KEY || "",
    numverify: process.env.NUMVERIFY_API_KEY || "",
    abstract: process.env.ABSTRACT_API_KEY || "",
  },
};

export function configuredProviders(): string[] {
  const list: string[] = [];
  if (config.providers.ipqs) list.push("ipqs");
  if (config.providers.numverify) list.push("numverify");
  if (config.providers.abstract) list.push("abstract");
  return list;
}
