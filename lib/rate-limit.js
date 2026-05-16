/**
 * Tiny in-memory IP rate limiter for public-facing API routes.
 *
 * Each route owns its own bucket map. On hit, we check if the current IP has
 * exceeded the configured limit in the rolling window. If yes, throw 429.
 *
 * This is per-instance memory — Vercel functions can warm-cache state but won't
 * share across regions. For pre-launch traffic this is enough; revisit with
 * Upstash or Vercel KV if abuse becomes a real problem.
 */
const buckets = new Map()  // key: `${routeName}:${ip}` → [timestamps]

export function rateLimit(req, { route, windowMs, max }) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  const key = `${route}:${ip}`
  const now = Date.now()
  const cutoff = now - windowMs

  const hits = (buckets.get(key) || []).filter(t => t > cutoff)
  hits.push(now)
  buckets.set(key, hits)

  if (hits.length > max) {
    return {
      limited: true,
      ip,
      retryAfter: Math.ceil((hits[0] + windowMs - now) / 1000),
    }
  }

  // Trim the bucket map occasionally so it doesn't grow unbounded
  if (Math.random() < 0.01) {
    for (const [k, ts] of buckets) {
      if (ts.every(t => t < cutoff)) buckets.delete(k)
    }
  }

  return { limited: false, ip }
}
