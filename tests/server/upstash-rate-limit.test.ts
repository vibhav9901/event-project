import { describe, expect, it } from 'vitest';
import { createUpstashRateLimiter } from '../../src/server/upstash-rate-limit';

const IP = '203.0.113.9';
const fallback = { check: () => ({ allowed: true, remaining: 99, retryAfterSeconds: 0 }) };

function setup(reply: () => Response | Promise<Response>) {
  const seen: { url: string; init?: RequestInit } = { url: '' };
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    seen.url = String(input);
    if (init) seen.init = init;
    return reply();
  }) as typeof fetch;
  const limiter = createUpstashRateLimiter({
    url: 'https://example.upstash.io/',
    token: 'secret-token',
    limit: 10,
    windowSeconds: 60,
    fallback,
    fetchImpl,
  });
  return { limiter, seen };
}

const pipeline = (count: number, ttl: number) =>
  new Response(JSON.stringify([{ result: count }, { result: 1 }, { result: ttl }]));

describe('createUpstashRateLimiter', () => {
  it('allows requests under the limit', async () => {
    const { limiter } = setup(() => pipeline(3, 55));
    expect(await limiter.check(IP)).toEqual({ allowed: true, remaining: 7, retryAfterSeconds: 0 });
  });

  it('blocks over the limit and reports the remaining window', async () => {
    const { limiter } = setup(() => pipeline(11, 42));
    expect(await limiter.check(IP)).toEqual({
      allowed: false,
      remaining: 0,
      retryAfterSeconds: 42,
    });
  });

  it('authenticates, uses the pipeline endpoint and never sends the raw address', async () => {
    const { limiter, seen } = setup(() => pipeline(1, 60));
    await limiter.check(IP);
    expect(seen.url).toBe('https://example.upstash.io/pipeline');
    expect(JSON.stringify(seen.init?.headers)).toContain('Bearer secret-token');
    expect(String(seen.init?.body)).not.toContain(IP);
  });

  it('falls back to the in-memory limiter when Upstash is unreachable or misbehaves', async () => {
    const down = setup(() => Promise.reject(new Error('network down')));
    const failing = setup(() => new Response('oops', { status: 500 }));
    const garbage = setup(() => new Response(JSON.stringify([{ error: 'nope' }])));
    for (const { limiter } of [down, failing, garbage]) {
      expect((await limiter.check(IP)).remaining).toBe(99);
    }
  });
});
