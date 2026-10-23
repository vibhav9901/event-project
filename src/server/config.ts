import { z } from 'zod';

const envSchema = z.object({
  GEMINI_API_KEY: z.string().trim().min(1).optional(),
  // Restricted charset: the model name ends up inside a request URL.
  GEMINI_MODEL: z
    .string()
    .trim()
    .regex(/^[a-z0-9][a-z0-9.-]{0,63}$/, 'Invalid model name')
    .default('gemini-3.5-flash'),
  UPSTASH_REDIS_REST_URL: z.string().trim().url().startsWith('https://').optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().trim().min(1).optional(),
});

export interface ServerConfig {
  readonly geminiApiKey: string | undefined;
  readonly geminiModel: string;
  /** Present only when both Upstash variables are set; otherwise rate limiting stays in memory. */
  readonly upstash: { readonly url: string; readonly token: string } | undefined;
}

/** Reads and validates environment variables. Empty strings count as unset. */
export function loadConfig(env: Record<string, string | undefined> = process.env): ServerConfig {
  const parsed = envSchema.parse({
    GEMINI_API_KEY: env.GEMINI_API_KEY || undefined,
    GEMINI_MODEL: env.GEMINI_MODEL || undefined,
    UPSTASH_REDIS_REST_URL: env.UPSTASH_REDIS_REST_URL || undefined,
    UPSTASH_REDIS_REST_TOKEN: env.UPSTASH_REDIS_REST_TOKEN || undefined,
  });
  const { UPSTASH_REDIS_REST_URL: url, UPSTASH_REDIS_REST_TOKEN: token } = parsed;
  return {
    geminiApiKey: parsed.GEMINI_API_KEY,
    geminiModel: parsed.GEMINI_MODEL,
    upstash: url && token ? { url, token } : undefined,
  };
}
