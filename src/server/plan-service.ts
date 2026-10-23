import type { IdeasGenerator } from '../ai/gemini';
import type { AiIdeas } from '../ai/ideas';
import { buildUserContent } from '../ai/prompt';
import { utcToday } from '../domain/dates';
import { buildPlan } from '../domain/plan';
import { planInputSchema, type PlanInput } from '../domain/schema';
import { DomainError, type EventPlan } from '../domain/types';
import { guardUserText } from '../security/guardrails';

export type AiStatus = 'ok' | 'disabled' | 'unavailable';

export interface PlanResponse {
  readonly plan: EventPlan;
  readonly ideas: AiIdeas | null;
  readonly aiStatus: AiStatus;
  /** Plain-language notes about what was changed or ignored before the AI saw the text. */
  readonly aiNotices: readonly string[];
}

export interface PlanError {
  readonly code: 'invalid_input' | 'invalid_date';
  readonly message: string;
  readonly issues?: ReadonlyArray<{ path: string; code: string }>;
}

export type PlanResult =
  | { readonly ok: true; readonly data: PlanResponse }
  | { readonly ok: false; readonly error: PlanError };

export interface Logger {
  error(message: string, detail?: unknown): void;
}

export interface PlanServiceDeps {
  /** Null when no API key is configured; the deterministic plan still works. */
  readonly ideas: IdeasGenerator | null;
  readonly today?: () => Date;
  readonly logger?: Logger;
}

export interface PlanService {
  create(raw: unknown, signal?: AbortSignal): Promise<PlanResult>;
}

/**
 * Orchestrates validation, the rules engine and (optionally) Gemini. The AI step is
 * additive and degrades gracefully: if it fails, the user still gets the full plan.
 */
export function createPlanService(deps: PlanServiceDeps): PlanService {
  const today = deps.today ?? (() => utcToday());
  const logger = deps.logger ?? console;

  async function generateIdeas(input: PlanInput, plan: EventPlan, signal: AbortSignal | undefined) {
    if (!deps.ideas) return { ideas: null, aiStatus: 'disabled' as const, aiNotices: [] };

    const guarded = guardUserText(input);
    const content = buildUserContent(
      { ...input, location: guarded.location, preferences: guarded.preferences },
      plan,
    );
    try {
      const ideas = await deps.ideas.generate(content, signal);
      return { ideas, aiStatus: 'ok' as const, aiNotices: guarded.notices };
    } catch (error) {
      // Log the error type only; never user-provided text.
      logger.error('AI idea generation failed', error instanceof Error ? error.name : 'unknown');
      return { ideas: null, aiStatus: 'unavailable' as const, aiNotices: [] };
    }
  }

  return {
    async create(raw, signal) {
      const parsed = planInputSchema.safeParse(raw);
      if (!parsed.success) {
        return {
          ok: false,
          error: {
            code: 'invalid_input',
            message: 'Some fields are missing or invalid.',
            issues: parsed.error.issues.map((issue) => ({
              path: issue.path.join('.'),
              code: issue.code,
            })),
          },
        };
      }

      let plan: EventPlan;
      try {
        plan = buildPlan(parsed.data, today());
      } catch (error) {
        if (error instanceof DomainError) {
          return { ok: false, error: { code: 'invalid_date', message: error.message } };
        }
        throw error;
      }

      return { ok: true, data: { plan, ...(await generateIdeas(parsed.data, plan, signal)) } };
    },
  };
}
