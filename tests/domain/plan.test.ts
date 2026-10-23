import { describe, expect, it } from 'vitest';
import { parseIsoDate } from '../../src/domain/dates';
import { buildPlan } from '../../src/domain/plan';
import type { PlanInput } from '../../src/domain/schema';
import { DomainError, EVENT_TYPES } from '../../src/domain/types';

const today = parseIsoDate('2026-10-22') as Date;
const input = (overrides: Partial<PlanInput> = {}): PlanInput => ({
  eventType: 'wedding',
  guestCount: 120,
  totalBudget: 40000,
  currency: 'USD',
  eventDate: '2027-06-12',
  location: '',
  preferences: '',
  ...overrides,
});

function errorOf(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  return undefined;
}

describe('buildPlan', () => {
  it('is deterministic for identical input', () => {
    expect(buildPlan(input(), today)).toEqual(buildPlan(input(), today));
  });

  it.each(EVENT_TYPES)('%s: every vendor maps to a real budget category', (eventType) => {
    const plan = buildPlan(input({ eventType, guestCount: 500 }), today);
    const categories = plan.budget.lines.map((line) => line.id);
    expect(plan.vendors.every((vendor) => categories.includes(vendor.budgetCategory))).toBe(true);
  });

  it('combines budget and timeline warnings for a rushed, underfunded event', () => {
    const plan = buildPlan(input({ eventDate: '2026-11-05', totalBudget: 2000 }), today);
    expect(plan.warnings.length).toBeGreaterThanOrEqual(2);
    expect(plan.decisions.join(' ')).toContain('Short notice');
  });

  it('accepts an event today but rejects a past date', () => {
    expect(buildPlan(input({ eventDate: '2026-10-22' }), today).daysUntilEvent).toBe(0);
    const error = errorOf(() => buildPlan(input({ eventDate: '2026-10-21' }), today));
    expect(error).toBeInstanceOf(DomainError);
    expect((error as DomainError).code).toBe('EVENT_DATE_IN_PAST');
  });
});
