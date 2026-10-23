/** Shared domain types. This layer is pure: no I/O, no framework imports. */

export const EVENT_TYPES = ['wedding', 'birthday', 'community'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const CURRENCIES = ['USD', 'EUR', 'GBP', 'INR'] as const;
export type Currency = (typeof CURRENCIES)[number];

export interface BudgetLine {
  readonly id: string;
  readonly label: string;
  readonly percent: number;
  readonly amount: number;
}

export interface BudgetPlan {
  readonly lines: readonly BudgetLine[];
  readonly perGuest: number;
  /** Human-readable explanations of context-driven adjustments. */
  readonly decisions: readonly string[];
  readonly warnings: readonly string[];
}

export type Urgency = 'on-track' | 'urgent';

export interface TimelineTask {
  readonly id: string;
  readonly title: string;
  readonly dueDate: string;
  readonly daysBeforeEvent: number;
  readonly urgency: Urgency;
}

export interface TimelinePlan {
  readonly tasks: readonly TimelineTask[];
  readonly compressed: boolean;
  readonly warnings: readonly string[];
}

export interface VendorItem {
  readonly id: string;
  readonly name: string;
  readonly budgetCategory: string;
  readonly priority: 'essential' | 'recommended';
  readonly keyQuestion: string;
}

export interface EventPlan {
  readonly eventType: EventType;
  readonly eventDate: string;
  readonly guestCount: number;
  readonly currency: Currency;
  readonly daysUntilEvent: number;
  readonly budget: BudgetPlan;
  readonly timeline: TimelinePlan;
  readonly vendors: readonly VendorItem[];
  readonly warnings: readonly string[];
  readonly decisions: readonly string[];
}

export type DomainErrorCode = 'EVENT_DATE_INVALID' | 'EVENT_DATE_IN_PAST';

export class DomainError extends Error {
  constructor(
    readonly code: DomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}
