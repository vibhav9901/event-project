import type { BudgetLine, BudgetPlan, Currency, EventType } from './types';

interface Category {
  readonly id: string;
  readonly label: string;
  /** Share of the budget in whole percentage points. Each event type sums to 100. */
  readonly weight: number;
}

interface Shift {
  readonly from: string;
  readonly to: string;
  readonly points: number;
}

export const LARGE_GUEST_THRESHOLD = 150;
export const SHORT_NOTICE_DAYS = 30;

const BASE_CATEGORIES: Readonly<Record<EventType, readonly Category[]>> = {
  wedding: [
    { id: 'venue', label: 'Venue', weight: 24 },
    { id: 'catering', label: 'Catering', weight: 34 },
    { id: 'photography', label: 'Photography & video', weight: 10 },
    { id: 'attire', label: 'Attire & beauty', weight: 8 },
    { id: 'decor', label: 'Decor & flowers', weight: 8 },
    { id: 'entertainment', label: 'Music & entertainment', weight: 8 },
    { id: 'contingency', label: 'Contingency', weight: 8 },
  ],
  birthday: [
    { id: 'venue', label: 'Venue', weight: 20 },
    { id: 'catering', label: 'Food, drinks & cake', weight: 35 },
    { id: 'entertainment', label: 'Entertainment', weight: 17 },
    { id: 'decor', label: 'Decor', weight: 12 },
    { id: 'favors', label: 'Favors & gifts', weight: 6 },
    { id: 'contingency', label: 'Contingency', weight: 10 },
  ],
  community: [
    { id: 'venue', label: 'Venue', weight: 20 },
    { id: 'catering', label: 'Refreshments', weight: 25 },
    { id: 'promotion', label: 'Promotion', weight: 15 },
    { id: 'equipment', label: 'Equipment & staging', weight: 20 },
    { id: 'permits', label: 'Permits & insurance', weight: 10 },
    { id: 'contingency', label: 'Contingency', weight: 10 },
  ],
};

/** Bigger crowds cost more to feed and equip, so money moves away from discretionary items. */
const LARGE_GUEST_SHIFT: Readonly<Record<EventType, Shift>> = {
  wedding: { from: 'decor', to: 'catering', points: 4 },
  birthday: { from: 'decor', to: 'catering', points: 4 },
  community: { from: 'promotion', to: 'equipment', points: 4 },
};

/** Short notice means rush fees and surprises, so the contingency pool grows. */
const SHORT_NOTICE_SHIFT: Readonly<Record<EventType, Shift>> = {
  wedding: { from: 'entertainment', to: 'contingency', points: 3 },
  birthday: { from: 'decor', to: 'contingency', points: 3 },
  community: { from: 'promotion', to: 'contingency', points: 3 },
};

/** Rough minimum sensible spend per guest, in USD. Scaled by CURRENCY_SCALE. */
const MIN_PER_GUEST_USD: Readonly<Record<EventType, number>> = {
  wedding: 40,
  birthday: 12,
  community: 5,
};

const CURRENCY_SCALE: Readonly<Record<Currency, number>> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  INR: 84,
};

export interface BudgetInput {
  readonly eventType: EventType;
  readonly guestCount: number;
  readonly totalBudget: number;
  readonly currency: Currency;
}

function applyShift(categories: readonly Category[], shift: Shift): readonly Category[] | null {
  const source = categories.find((category) => category.id === shift.from);
  const target = categories.find((category) => category.id === shift.to);
  if (!source || !target || source.weight < shift.points) return null;
  return categories.map((category) => {
    if (category.id === shift.from) return { ...category, weight: category.weight - shift.points };
    if (category.id === shift.to) return { ...category, weight: category.weight + shift.points };
    return category;
  });
}

/**
 * Splits `total` across `weights` using the largest-remainder method, so the
 * parts are whole numbers that always add up to exactly `total`.
 */
export function allocate(total: number, weights: readonly number[]): number[] {
  const weightSum = weights.reduce((sum, weight) => sum + weight, 0);
  const shares = weights.map((weight, index) => {
    const exact = (total * weight) / weightSum;
    return { index, floor: Math.floor(exact), fraction: exact - Math.floor(exact) };
  });
  const remainder = total - shares.reduce((sum, share) => sum + share.floor, 0);
  const bumped = new Set(
    [...shares]
      .sort((a, b) => b.fraction - a.fraction || a.index - b.index)
      .slice(0, remainder)
      .map((share) => share.index),
  );
  return shares.map((share) => share.floor + (bumped.has(share.index) ? 1 : 0));
}

function labelOf(categories: readonly Category[], id: string): string {
  return categories.find((category) => category.id === id)?.label ?? id;
}

/** Deterministic budget split that adapts to guest count and lead time. */
export function planBudget(input: BudgetInput, daysUntilEvent: number): BudgetPlan {
  const { eventType, guestCount, totalBudget, currency } = input;
  const decisions: string[] = [];
  const warnings: string[] = [];
  let categories = BASE_CATEGORIES[eventType];

  const adjustments: ReadonlyArray<readonly [boolean, Shift, string]> = [
    [
      guestCount >= LARGE_GUEST_THRESHOLD,
      LARGE_GUEST_SHIFT[eventType],
      `Large guest list (${guestCount})`,
    ],
    [
      daysUntilEvent < SHORT_NOTICE_DAYS,
      SHORT_NOTICE_SHIFT[eventType],
      `Short notice (${daysUntilEvent} days)`,
    ],
  ];

  for (const [applies, shift, trigger] of adjustments) {
    if (!applies) continue;
    const shifted = applyShift(categories, shift);
    if (!shifted) continue;
    decisions.push(
      `${trigger}: moved ${shift.points}% from ${labelOf(categories, shift.from)} to ${labelOf(categories, shift.to)}.`,
    );
    categories = shifted;
  }

  const amounts = allocate(
    totalBudget,
    categories.map((category) => category.weight),
  );
  const lines: BudgetLine[] = categories.map((category, index) => ({
    id: category.id,
    label: category.label,
    percent: category.weight,
    amount: amounts[index] ?? 0,
  }));

  const perGuest = Math.round(totalBudget / guestCount);
  const minimum = Math.round(MIN_PER_GUEST_USD[eventType] * CURRENCY_SCALE[currency]);
  if (perGuest < minimum) {
    warnings.push(
      `Budget is about ${perGuest} ${currency} per guest; a ${eventType} usually needs at least ${minimum}. Consider fewer guests, a simpler menu or a higher budget.`,
    );
  }

  return { lines, perGuest, decisions, warnings };
}
