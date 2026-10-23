import { describe, expect, it } from 'vitest';
import { withCache } from '../../src/ai/cache';
import type { IdeasGenerator } from '../../src/ai/gemini';

const ideas = {
  summary: 's',
  ideas: [1, 2, 3].map((n) => ({ title: `T${n}`, description: 'd', costLevel: 'low' as const })),
};

function counting(failFirst = false) {
  let calls = 0;
  const generator: IdeasGenerator = {
    generate: async () => {
      calls += 1;
      if (failFirst && calls === 1) throw new Error('boom');
      return ideas;
    },
  };
  return { generator, calls: () => calls };
}

describe('withCache', () => {
  it('serves identical requests from memory', async () => {
    const { generator, calls } = counting();
    const cached = withCache(generator);
    await cached.generate('a');
    await cached.generate('a');
    expect(calls()).toBe(1);
  });

  it('keeps different requests separate', async () => {
    const { generator, calls } = counting();
    const cached = withCache(generator);
    await cached.generate('a');
    await cached.generate('b');
    expect(calls()).toBe(2);
  });

  it('expires entries after the TTL', async () => {
    let now = 0;
    const { generator, calls } = counting();
    const cached = withCache(generator, { ttlMs: 1000, now: () => now });
    await cached.generate('a');
    now = 1001;
    await cached.generate('a');
    expect(calls()).toBe(2);
  });

  it('never caches failures', async () => {
    const { generator, calls } = counting(true);
    const cached = withCache(generator);
    let failed = false;
    try {
      await cached.generate('a');
    } catch {
      failed = true;
    }
    await cached.generate('a');
    expect(failed).toBe(true);
    expect(calls()).toBe(2);
  });

  it('evicts the oldest entry beyond its size limit', async () => {
    const { generator, calls } = counting();
    const cached = withCache(generator, { maxEntries: 2 });
    for (const key of ['a', 'b', 'c', 'a']) await cached.generate(key);
    expect(calls()).toBe(4);
  });
});
