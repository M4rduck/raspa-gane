/**
 * Rate limiting en memoria por proceso (Edge/Node).
 * En varias réplicas de ECS/Lambda cada una tiene su contador: para límites globales usa Redis (Upstash, ElastiCache).
 */

type Bucket = { count: number; resetAt: number };

const store = new Map<string, Bucket>();
const MAX_KEYS = 50_000;

function prune(now: number) {
  if (store.size < MAX_KEYS) return;
  for (const [k, b] of store) {
    if (now > b.resetAt) store.delete(k);
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now = Date.now(),
): RateLimitResult {
  prune(now);
  const b = store.get(key);
  if (!b || now > b.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (b.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((b.resetAt - now) / 1000)) };
  }
  b.count += 1;
  return { ok: true };
}

export function clientIpFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first.slice(0, 45);
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real.slice(0, 45);
  return "unknown";
}
