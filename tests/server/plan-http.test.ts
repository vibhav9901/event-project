import { describe, expect, it } from 'vitest';
import { parseIsoDate } from '../../src/domain/dates';
import { createPlanHandler, getClientIp } from '../../src/server/plan-http';
import { createPlanService } from '../../src/server/plan-service';
import { createRateLimiter } from '../../src/server/rate-limit';

const valid = {
  eventType: 'community',
  guestCount: 120,
  totalBudget: 8000,
  currency: 'GBP',
  eventDate: '2027-04-10',
};
const silent = { error: () => {} };

function handler(limit = 100) {
  return createPlanHandler({
    service: createPlanService({ ideas: null, today: () => parseIsoDate('2026-10-22') as Date }),
    limiter: createRateLimiter({ limit, windowMs: 60_000 }),
    logger: silent,
  });
}

const post = (body: string, headers: Record<string, string> = {}) =>
  new Request('http://localhost/api/plan', {
    method: 'POST',
    body,
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '9.9.9.9', ...headers },
  });

describe('POST /api/plan handler', () => {
  it('returns 200 with no-store caching for a valid request', async () => {
    const response = await handler()(post(JSON.stringify(valid)));
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(((await response.json()) as { aiStatus: string }).aiStatus).toBe('disabled');
  });

  it('returns 400 for invalid JSON and invalid fields', async () => {
    expect((await handler()(post('{nope'))).status).toBe(400);
    expect((await handler()(post(JSON.stringify({ ...valid, guestCount: 0 })))).status).toBe(400);
  });

  it('returns 415 for the wrong content type', async () => {
    expect((await handler()(post('x', { 'content-type': 'text/plain' }))).status).toBe(415);
  });

  it('returns 413 for oversized bodies', async () => {
    expect((await handler()(post('x'.repeat(9000)))).status).toBe(413);
  });

  it('returns 429 with Retry-After once the limit is hit', async () => {
    const h = handler(1);
    await h(post(JSON.stringify(valid)));
    const blocked = await h(post(JSON.stringify(valid)));
    expect(blocked.status).toBe(429);
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThanOrEqual(1);
  });

  it('hides internal details on unexpected errors', async () => {
    const crashing = createPlanHandler({
      service: {
        create: async () => {
          throw new Error('db password is hunter2');
        },
      },
      limiter: createRateLimiter({ limit: 5, windowMs: 1000 }),
      logger: silent,
    });
    const response = await crashing(post(JSON.stringify(valid)));
    expect(response.status).toBe(500);
    expect(JSON.stringify(await response.json())).not.toContain('hunter2');
  });
});

describe('getClientIp', () => {
  it('prefers x-real-ip, then the first forwarded address', () => {
    expect(getClientIp(new Headers({ 'x-real-ip': '1.1.1.1', 'x-forwarded-for': '2.2.2.2' }))).toBe(
      '1.1.1.1',
    );
    expect(getClientIp(new Headers({ 'x-forwarded-for': '2.2.2.2, 3.3.3.3' }))).toBe('2.2.2.2');
    expect(getClientIp(new Headers())).toBe('unknown');
  });
});

describe('request safety', () => {
  it('refuses cross-site browser requests but allows same-origin ones', async () => {
    expect(
      (await handler()(post(JSON.stringify(valid), { 'sec-fetch-site': 'cross-site' }))).status,
    ).toBe(403);
    expect(
      (await handler()(post(JSON.stringify(valid), { 'sec-fetch-site': 'same-origin' }))).status,
    ).toBe(200);
  });

  it('does not spend rate-limit quota on refused cross-site requests', async () => {
    const h = handler(1);
    await h(post(JSON.stringify(valid), { 'sec-fetch-site': 'cross-site' }));
    expect((await h(post(JSON.stringify(valid)))).status).toBe(200);
  });

  it('forwards the request abort signal so a disconnect cancels the AI call', async () => {
    const seen: { signal?: AbortSignal } = {};
    const h = createPlanHandler({
      service: {
        create: async (_raw, signal) => {
          if (signal) seen.signal = signal;
          return { ok: false, error: { code: 'invalid_input', message: 'x' } };
        },
      },
      limiter: createRateLimiter({ limit: 5, windowMs: 1000 }),
      logger: silent,
    });
    const controller = new AbortController();
    await h(
      new Request('http://localhost/api/plan', {
        method: 'POST',
        body: '{}',
        signal: controller.signal,
        headers: { 'content-type': 'application/json' },
      }),
    );
    controller.abort();
    expect(seen.signal?.aborted).toBe(true);
  });
});
