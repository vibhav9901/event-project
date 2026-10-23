import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../src/server/rate-limit';

describe('createRateLimiter', () => {
  it('blocks after the limit and reports when to retry', () => {
    const now = 0;
    const limiter = createRateLimiter({ limit: 2, windowMs: 1000, now: () => now });
    expect(limiter.check('a').allowed).toBe(true);
    expect(limiter.check('a').remaining).toBe(0);
    const blocked = limiter.check('a');
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBe(1);
  });

  it('allows again once the window has passed', () => {
    let now = 0;
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => now });
    limiter.check('a');
    expect(limiter.check('a').allowed).toBe(false);
    now = 1001;
    expect(limiter.check('a').allowed).toBe(true);
  });

  it('tracks clients independently', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, now: () => 0 });
    limiter.check('a');
    expect(limiter.check('b').allowed).toBe(true);
  });

  it('evicts the stalest key instead of growing without bound', () => {
    const limiter = createRateLimiter({ limit: 1, windowMs: 1000, maxKeys: 2, now: () => 0 });
    limiter.check('a');
    limiter.check('b');
    limiter.check('c');
    expect(limiter.check('a').allowed).toBe(true);
  });
});
