import { withCache } from '../ai/cache';
import { createIdeasGenerator } from '../ai/gemini';
import { createGeminiClient } from '../ai/gemini-client';
import { loadConfig } from './config';
import { createPlanHandler } from './plan-http';
import { createPlanService } from './plan-service';
import { createRateLimiter } from './rate-limit';
import { createUpstashRateLimiter } from './upstash-rate-limit';

const REQUESTS_PER_MINUTE = 10;

type Handler = (request: Request) => Promise<Response>;
let handler: Handler | undefined;

/** Composition root: wires real dependencies once per server instance. */
export function getPlanHandler(): Handler {
  if (!handler) {
    const config = loadConfig();
    const ideas = config.geminiApiKey
      ? withCache(
          createIdeasGenerator({
            client: createGeminiClient(config.geminiApiKey),
            model: config.geminiModel,
          }),
        )
      : null;

    const memoryLimiter = createRateLimiter({ limit: REQUESTS_PER_MINUTE, windowMs: 60_000 });
    const limiter = config.upstash
      ? createUpstashRateLimiter({
          ...config.upstash,
          limit: REQUESTS_PER_MINUTE,
          windowSeconds: 60,
          fallback: memoryLimiter,
        })
      : memoryLimiter;

    handler = createPlanHandler({ service: createPlanService({ ideas }), limiter });
  }
  return handler;
}
