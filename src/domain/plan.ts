import { daysBetween, parseIsoDate, utcToday } from './dates';
import { planBudget } from './budget';
import type { PlanInput } from './schema';
import { planTimeline } from './timeline';
import { DomainError, type EventPlan } from './types';
import { planVendors } from './vendors';

/**
 * Composes the full deterministic plan (budget, timeline, vendors).
 * `today` is injectable so the function stays pure and testable.
 */
export function buildPlan(input: PlanInput, today: Date = utcToday()): EventPlan {
  const eventDate = parseIsoDate(input.eventDate);
  if (!eventDate) {
    throw new DomainError(
      'EVENT_DATE_INVALID',
      'Event date must be a real date in YYYY-MM-DD format.',
    );
  }
  const daysUntilEvent = daysBetween(today, eventDate);
  if (daysUntilEvent < 0) {
    throw new DomainError('EVENT_DATE_IN_PAST', 'Event date must be today or later.');
  }

  const budget = planBudget(input, daysUntilEvent);
  const timeline = planTimeline(input.eventType, eventDate, today);
  const vendors = planVendors(input.eventType, input.guestCount);

  return {
    eventType: input.eventType,
    eventDate: input.eventDate,
    guestCount: input.guestCount,
    currency: input.currency,
    daysUntilEvent,
    budget,
    timeline,
    vendors,
    warnings: [...budget.warnings, ...timeline.warnings],
    decisions: budget.decisions,
  };
}
