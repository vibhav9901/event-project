import { describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/server/config';

describe('loadConfig', () => {
  it('defaults the model and treats an empty key as unset', () => {
    expect(loadConfig({ GEMINI_API_KEY: '' })).toEqual({
      geminiApiKey: undefined,
      geminiModel: 'gemini-3.5-flash',
      upstash: undefined,
    });
  });

  it('accepts overrides', () => {
    expect(loadConfig({ GEMINI_API_KEY: 'k', GEMINI_MODEL: 'gemini-3.6-flash' })).toEqual({
      geminiApiKey: 'k',
      geminiModel: 'gemini-3.6-flash',
      upstash: undefined,
    });
  });

  it.each(['../models/x', 'a b', 'MODEL', 'x?key=1'])('rejects unsafe model name %s', (model) => {
    expect(() => loadConfig({ GEMINI_MODEL: model })).toThrow();
  });

  it('enables the shared rate limiter only when both Upstash variables are set', () => {
    const url = 'https://example.upstash.io';
    expect(
      loadConfig({ UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: 't' }).upstash,
    ).toEqual({ url, token: 't' });
    expect(loadConfig({ UPSTASH_REDIS_REST_URL: url }).upstash).toBeUndefined();
    expect(loadConfig({ UPSTASH_REDIS_REST_TOKEN: 't' }).upstash).toBeUndefined();
  });

  it('refuses a non-HTTPS Upstash URL', () => {
    expect(() =>
      loadConfig({
        UPSTASH_REDIS_REST_URL: 'http://example.upstash.io',
        UPSTASH_REDIS_REST_TOKEN: 't',
      }),
    ).toThrow();
  });
});
