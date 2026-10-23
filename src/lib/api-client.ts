import type { PlanResponse } from '../server/plan-service';

export type PlanField =
  | 'eventType'
  | 'guestCount'
  | 'totalBudget'
  | 'currency'
  | 'eventDate'
  | 'location'
  | 'preferences';

export type FieldErrors = Partial<Record<PlanField, string>>;

export type PlanOutcome =
  | { kind: 'success'; data: PlanResponse }
  | { kind: 'field-errors'; fields: FieldErrors; message: string }
  | { kind: 'rate-limited'; message: string }
  | { kind: 'error'; message: string };

const FIELD_MESSAGES: Readonly<Record<PlanField, string>> = {
  eventType: 'Choose what you are celebrating.',
  guestCount: 'Enter a whole number of guests from 1 to 2,000.',
  totalBudget: 'Enter a whole-number budget from 100 to 10,000,000.',
  currency: 'Choose a currency.',
  eventDate: 'Choose a real date that is today or later.',
  location: 'Keep the location to 100 characters or fewer.',
  preferences: 'Keep your preferences to 500 characters or fewer.',
};

const GENERIC_ERROR = 'We could not create your plan. Please try again.';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPlanField(value: string): value is PlanField {
  return Object.hasOwn(FIELD_MESSAGES, value);
}

function collectFieldErrors(error: Record<string, unknown>): FieldErrors {
  const fields: FieldErrors = {};
  if (error.code === 'invalid_date') fields.eventDate = FIELD_MESSAGES.eventDate;
  if (Array.isArray(error.issues)) {
    for (const issue of error.issues as unknown[]) {
      const path =
        isRecord(issue) && typeof issue.path === 'string' ? issue.path.split('.')[0] : '';
      if (path && isPlanField(path)) fields[path] = FIELD_MESSAGES[path];
    }
  }
  return fields;
}

/** Turns an HTTP response from /api/plan into something the UI can render. */
export function interpretResponse(
  status: number,
  body: unknown,
  retryAfter: string | null,
): PlanOutcome {
  if (status === 200 && isRecord(body) && isRecord(body.plan)) {
    return { kind: 'success', data: body as unknown as PlanResponse };
  }
  if (status === 429) {
    const seconds = Math.max(1, Number(retryAfter) || 30);
    return { kind: 'rate-limited', message: `Too many requests. Try again in ${seconds} seconds.` };
  }
  if (status === 400 && isRecord(body) && isRecord(body.error)) {
    const fields = collectFieldErrors(body.error);
    if (Object.keys(fields).length > 0) {
      return {
        kind: 'field-errors',
        fields,
        message: 'Fix the highlighted details and try again.',
      };
    }
  }
  return { kind: 'error', message: GENERIC_ERROR };
}
