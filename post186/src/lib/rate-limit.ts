/**
 * In-memory sliding-window rate limiter. Per process, resets on restart.
 * Enough to blunt casual abuse on a small site; pair with a platform-level limit for stronger guarantees.
 */
type Store = Map<string, number[]>;
const globalForRl = globalThis as unknown as { __post186RateLimit?: Store };
const store: Store = globalForRl.__post186RateLimit ?? new Map();
globalForRl.__post186RateLimit = store;

export function checkRateLimit(
  key: string,
  limit = 5,
  windowMs = 10 * 60 * 1000,
  now = Date.now(),
): { ok: boolean; retryAfterSec: number } {
  const cutoff = now - windowMs;
  const hits = (store.get(key) ?? []).filter((t) => t > cutoff);
  if (hits.length >= limit) {
    const retryAfterSec = Math.ceil((hits[0] + windowMs - now) / 1000);
    store.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(retryAfterSec, 1) };
  }
  hits.push(now);
  store.set(key, hits);
  if (store.size > 5000) {
    for (const [k, v] of store) if (v.every((t) => t <= cutoff)) store.delete(k);
  }
  return { ok: true, retryAfterSec: 0 };
}

export function resetRateLimits() {
  store.clear();
}
