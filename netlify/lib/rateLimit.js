// Tiny in-memory sliding-window limiter. Serverless instances are short-lived, so this is a
// best-effort first line of defence; the database also enforces per-phone limits in place_order().
const buckets = new Map();

export function rateLimit(key, limit, windowMs, now = Date.now()) {
  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { allowed: false, retryAfter: Math.ceil((windowMs - (now - hits[0])) / 1000) };
  }
  hits.push(now);
  buckets.set(key, hits);
  if (buckets.size > 5000) {
    for (const [k, v] of buckets) if (!v.length || now - v[v.length - 1] > windowMs) buckets.delete(k);
  }
  return { allowed: true, retryAfter: 0 };
}

export function _resetRateLimit() {
  buckets.clear();
}
