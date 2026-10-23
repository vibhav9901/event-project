export interface RateLimitResult {
  readonly allowed: boolean;
  readonly remaining: number;
  readonly retryAfterSeconds: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult | Promise<RateLimitResult>;
}

/** The in-memory limiter answers synchronously; callers holding a `RateLimiter` must await. */
export interface MemoryRateLimiter extends RateLimiter {
  check(key: string): RateLimitResult;
}

export interface RateLimiterOptions {
  readonly limit: number;
  readonly windowMs: number;
  /** Upper bound on tracked keys so memory use stays constant under abuse. */
  readonly maxKeys?: number;
  readonly now?: () => number;
}

/**
 * Sliding-window limiter. In-memory, so it is per server instance: a sensible
 * guard for a demo, not a global quota (use a shared store for that).
 */
export function createRateLimiter(options: RateLimiterOptions): MemoryRateLimiter {
  const { limit, windowMs, maxKeys = 5000, now = Date.now } = options;
  const hits = new Map<string, number[]>();

  return {
    check(key) {
      const current = now();
      const recent = (hits.get(key) ?? []).filter((time) => time > current - windowMs);

      if (recent.length >= limit) {
        hits.set(key, recent);
        const oldest = recent[0] ?? current;
        const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - current) / 1000));
        return { allowed: false, remaining: 0, retryAfterSeconds };
      }

      recent.push(current);
      hits.delete(key); // re-insert so the Map order doubles as least-recently-used order
      hits.set(key, recent);
      while (hits.size > maxKeys) {
        const stalest = hits.keys().next().value;
        if (stalest === undefined) break;
        hits.delete(stalest);
      }
      return { allowed: true, remaining: limit - recent.length, retryAfterSeconds: 0 };
    },
  };
}
