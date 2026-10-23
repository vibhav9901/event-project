import { describe, expect, it } from 'vitest';
import { allocate, planBudget } from '../../src/domain/budget';
import { EVENT_TYPES } from '../../src/domain/types';

const base = {
  eventType: 'wedding',
  guestCount: 100,
  totalBudget: 30000,
  currency: 'USD',
} as const;
const percentSum = (lines: readonly { percent: number }[]) =>
  lines.reduce((s, l) => s + l.percent, 0);
const amountSum = (lines: readonly { amount: number }[]) => lines.reduce((s, l) => s + l.amount, 0);
const percentOf = (plan: ReturnType<typeof planBudget>, id: string) =>
  plan.lines.find((line) => line.id === id)?.percent;

describe('allocate', () => {
  it('uses largest remainder with stable tie-breaking', () => {
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it('always sums exactly to the total', () => {
    for (let total = 100; total < 400; total += 7) {
      expect(allocate(total, [24, 34, 10, 8, 8, 8, 8]).reduce((a, b) => a + b, 0)).toBe(total);
    }
  });
});

describe('planBudget', () => {
  it('uses the base split when context is ordinary', () => {
    const plan = planBudget(base, 200);
    expect(percentOf(plan, 'catering')).toBe(34);
    expect(plan.decisions).toHaveLength(0);
  });

  it.each(EVENT_TYPES)('%s: percentages total 100 and amounts total the budget', (eventType) => {
    const plan = planBudget({ ...base, eventType, guestCount: 200 }, 10);
    expect(percentSum(plan.lines)).toBe(100);
    expect(amountSum(plan.lines)).toBe(30000);
  });

  it('shifts money to catering for large guest lists and explains why', () => {
    const plan = planBudget({ ...base, guestCount: 200 }, 200);
    expect(percentOf(plan, 'catering')).toBe(38);
    expect(percentOf(plan, 'decor')).toBe(4);
    expect(plan.decisions.join(' ')).toContain('Large guest list');
  });

  it('grows contingency on short notice', () => {
    const plan = planBudget(base, 10);
    expect(percentOf(plan, 'contingency')).toBe(11);
    expect(plan.decisions.join(' ')).toContain('Short notice');
  });

  it('warns when the budget per guest is unrealistically low', () => {
    expect(planBudget({ ...base, totalBudget: 1000 }, 200).warnings).toHaveLength(1);
    expect(planBudget(base, 200).warnings).toHaveLength(0);
  });

  it('scales the per-guest minimum by currency', () => {
    expect(
      planBudget({ ...base, currency: 'INR', totalBudget: 100000 }, 200).warnings,
    ).toHaveLength(1);
    expect(
      planBudget({ ...base, currency: 'INR', totalBudget: 500000 }, 200).warnings,
    ).toHaveLength(0);
  });
});
