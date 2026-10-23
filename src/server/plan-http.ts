import type { Logger, PlanService } from './plan-service';
import type { RateLimiter } from './rate-limit';

const MAX_BODY_CHARS = 8 * 1024;
const NO_STORE = { 'Cache-Control': 'no-store' } as const;

export interface PlanHandlerDeps {
  readonly service: PlanService;
  readonly limiter: RateLimiter;
  readonly logger?: Logger;
}

/** Best-effort client address. Vercel overwrites these headers at the edge. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  return (headers.get('x-real-ip') ?? forwarded ?? 'unknown').slice(0, 64);
}

function json(status: number, body: unknown, extra: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...NO_STORE, ...extra } });
}

function failure(status: number, code: string, message: string, extra?: Record<string, string>) {
  return json(status, { error: { code, message } }, extra);
}

/** HTTP adapter: transport concerns only (origin, limits, content type, status codes). */
export function createPlanHandler(deps: PlanHandlerDeps): (request: Request) => Promise<Response> {
  const logger = deps.logger ?? console;

  return async function handlePlanRequest(request) {
    // Browsers label the request origin; refuse other sites driving our API from a visitor's browser.
    if (request.headers.get('sec-fetch-site') === 'cross-site') {
      return failure(403, 'forbidden', 'Cross-site requests are not allowed.');
    }

    const limit = await deps.limiter.check(getClientIp(request.headers));
    if (!limit.allowed) {
      return failure(
        429,
        'rate_limited',
        'Too many requests. Please wait a moment and try again.',
        {
          'Retry-After': String(limit.retryAfterSeconds),
        },
      );
    }

    if (!request.headers.get('content-type')?.toLowerCase().includes('application/json')) {
      return failure(415, 'unsupported_media_type', 'Content-Type must be application/json.');
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_CHARS) {
      return failure(413, 'payload_too_large', 'Request is too large.');
    }

    try {
      const body = await request.text();
      if (body.length > MAX_BODY_CHARS) {
        return failure(413, 'payload_too_large', 'Request is too large.');
      }

      let payload: unknown;
      try {
        payload = JSON.parse(body);
      } catch {
        return failure(400, 'invalid_json', 'Request body must be valid JSON.');
      }

      const result = await deps.service.create(payload, request.signal);
      return result.ok ? json(200, result.data) : json(400, { error: result.error });
    } catch (error) {
      logger.error('Unhandled error in /api/plan', error instanceof Error ? error.name : 'unknown');
      return failure(500, 'internal_error', 'Something went wrong. Please try again.');
    }
  };
}
