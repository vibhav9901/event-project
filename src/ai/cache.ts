import type { IdeasGenerator } from './gemini';
import type { AiIdeas } from './ideas';

export interface CacheOptions {
  readonly maxEntries?: number;
  readonly ttlMs?: number;
  readonly now?: () => number;
}

/**
 * Decorator that remembers recent successful results for identical requests, which saves
 * tokens and latency when a user re-submits. Failures are never cached. Memory only.
 */
export function withCache(inner: IdeasGenerator, options: CacheOptions = {}): IdeasGenerator {
  const { maxEntries = 50, ttlMs = 300_000, now = Date.now } = options;
  const entries = new Map<string, { value: AiIdeas; expiresAt: number }>();

  return {
    async generate(userContent, signal) {
      const hit = entries.get(userContent);
      if (hit && hit.expiresAt > now()) return hit.value;
      entries.delete(userContent);

      const value = await inner.generate(userContent, signal);
      entries.set(userContent, { value, expiresAt: now() + ttlMs });
      while (entries.size > maxEntries) {
        const oldest = entries.keys().next().value;
        if (oldest === undefined) break;
        entries.delete(oldest);
      }
      return value;
    },
  };
}
