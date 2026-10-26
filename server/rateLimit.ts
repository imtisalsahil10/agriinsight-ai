/**
 * Best-effort in-memory rate limit.
 *
 * Each serverless isolate keeps its own Map. A cold start empties it.
 * Vercel does not share this state across regions or instances, and a
 * client can present a different address. This is abuse friction, not a
 * global or durable quota.
 */

interface Bucket {
  resetAt: number;
  count: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimit {
  limit: number;
  windowMs: number;
}

export const LIVE_TOKEN_LIMIT: RateLimit = { limit: 10, windowMs: 60_000 };
export const GEMINI_LIMIT: RateLimit = { limit: 30, windowMs: 60_000 };

export function rateLimit(key: string, rule: RateLimit, now = Date.now()): { ok: true } | { ok: false; retryAfterSec: number } {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { resetAt: now + rule.windowMs, count: 1 });
    return { ok: true };
  }
  if (existing.count >= rule.limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)) };
  }
  existing.count += 1;
  return { ok: true };
}
