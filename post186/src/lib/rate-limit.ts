import "server-only";

import { headers } from "next/headers";
import { query, run } from "./db";

/** Best-effort caller address, for rate limiting only. Never stored with form data. */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

/**
 * Fixed-window rate limit kept in the database so it works across serverless
 * instances. Returns true when the call is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);

  if (Math.random() < 0.02) {
    await run("DELETE FROM rate_limits WHERE window_start < ?", [now - 86_400]);
  }

  const rows = await query("SELECT count, window_start FROM rate_limits WHERE key = ?", [key]);
  if (!rows.length || now - Number(rows[0].window_start) >= windowSeconds) {
    await run(
      `INSERT INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)
       ON CONFLICT(key) DO UPDATE SET count = 1, window_start = excluded.window_start`,
      [key, now],
    );
    return true;
  }
  if (Number(rows[0].count) >= limit) return false;
  await run("UPDATE rate_limits SET count = count + 1 WHERE key = ?", [key]);
  return true;
}

export async function resetRateLimit(key: string): Promise<void> {
  await run("DELETE FROM rate_limits WHERE key = ?", [key]);
}
