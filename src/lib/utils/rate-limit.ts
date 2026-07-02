/**
 * rate-limit.ts — minimal in-memory per-IP rate limiter (부속I T17).
 *
 * Deliberately simple: a fixed-window counter kept in a module-scope Map.
 * This is sufficient for the low-volume /api/email-results route (a warm
 * serverless instance shares the Map across requests during its lifetime;
 * a cold start simply resets the window, which is an acceptable trade-off
 * for a spam-throttle, not a security boundary). For multi-instance/durable
 * rate limiting, swap in a shared store (Redis/Upstash) — not needed at
 * current traffic.
 */

interface WindowEntry {
  count: number;
  windowStart: number;
}

const buckets = new Map<string, WindowEntry>();

/** Extracts the best-effort client IP from standard proxy headers (Vercel sets x-forwarded-for). */
export function getClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0].trim();
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return 'unknown';
}

/**
 * Returns true when the request is within the allowed rate, false when it
 * should be rejected (429). Uses a fixed window per key.
 */
export function checkRateLimit(
  key: string,
  { limit = 5, windowMs = 60_000 }: { limit?: number; windowMs?: number } = {}
): boolean {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || now - entry.windowStart >= windowMs) {
    buckets.set(key, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= limit) return false;

  entry.count += 1;
  return true;
}
