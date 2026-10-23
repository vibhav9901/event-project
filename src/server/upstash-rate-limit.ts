import type { RateLimiter } from './rate-limit';

export interface UpstashRateLimiterOptions {
  readonly url: string;
  readonly token: string;
  readonly limit: number;
  readonly windowSeconds: number;
  /** Used when Upstash is unreachable, so an outage never takes the app down. */
  readonly fallback: RateLimiter;
  readonly fetchImpl?: typeof fetch;
}

async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Fixed-window limiter backed by Upstash Redis over REST, so the quota is shared across all
 * serverless instances. Client addresses are hashed before they leave the server.
 */
export function createUpstashRateLimiter(options: UpstashRateLimiterOptions): RateLimiter {
  const { url, token, limit, windowSeconds, fallback, fetchImpl = fetch } = options;
  const endpoint = `${url.replace(/\/$/, '')}/pipeline`;

  return {
    async check(key) {
      try {
        const redisKey = `rl:plan:${(await sha256Hex(key)).slice(0, 32)}`;
        const response = await fetchImpl(endpoint, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify([
            ['INCR', redisKey],
            ['EXPIRE', redisKey, windowSeconds, 'NX'],
            ['TTL', redisKey],
          ]),
          signal: AbortSignal.timeout(1500),
        });
        if (!response.ok) throw new Error(`Upstash responded ${response.status}`);

        const results = (await response.json()) as Array<{ result?: unknown }>;
        const count = Number(results[0]?.result);
        const ttl = Number(results[2]?.result);
        if (!Number.isFinite(count)) throw new Error('Unexpected Upstash response');

        const allowed = count <= limit;
        return {
          allowed,
          remaining: Math.max(0, limit - count),
          retryAfterSeconds: allowed ? 0 : Math.max(1, Number.isFinite(ttl) ? ttl : windowSeconds),
        };
      } catch {
        return fallback.check(key);
      }
    },
  };
}
