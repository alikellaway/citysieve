/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Each instance tracks request counts per key (typically an IP address).
 * Old entries are lazily pruned on every `check()` call so the map doesn't
 * grow without bound.
 */

interface TokenBucket {
  count: number;
  resetAt: number;
}

interface RateLimitConfig {
  /** Maximum requests allowed per window. */
  maxRequests: number;
  /** Window duration in milliseconds. */
  windowMs: number;
}

export class RateLimiter {
  private buckets = new Map<string, TokenBucket>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(config: RateLimitConfig) {
    this.maxRequests = config.maxRequests;
    this.windowMs = config.windowMs;
  }

  /**
   * Returns `true` if the request should be **allowed**, `false` if rate-limited.
   */
  check(key: string): boolean {
    const now = Date.now();
    const bucket = this.buckets.get(key);

    if (!bucket || now >= bucket.resetAt) {
      this.buckets.set(key, { count: 1, resetAt: now + this.windowMs });
      this.prune(now);
      return true;
    }

    bucket.count++;
    return bucket.count <= this.maxRequests;
  }

  /** Remove expired entries so memory stays bounded. */
  private prune(now: number) {
    // Only prune occasionally to avoid O(n) on every call
    if (this.buckets.size < 500) return;
    for (const [k, v] of this.buckets) {
      if (now >= v.resetAt) this.buckets.delete(k);
    }
  }
}
