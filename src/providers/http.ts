// Small fetch helper with timeout. Node 20 has global fetch + AbortSignal.timeout.

export async function getJson(url: string, timeoutMs = 8000): Promise<any> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function clean(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "unknown" || s === "N/A" ? null : s;
}

export function normLineType(
  v: unknown
): "mobile" | "landline" | "voip" | "unknown" | null {
  const s = clean(v)?.toLowerCase();
  if (!s) return null;
  if (s.includes("mobile") || s.includes("cell") || s.includes("wireless")) return "mobile";
  if (s.includes("voip")) return "voip";
  if (s.includes("land") || s.includes("fixed")) return "landline";
  return "unknown";
}

export { clean };
