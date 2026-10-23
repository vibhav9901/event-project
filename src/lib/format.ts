import type { EventType } from '../domain/types';

export const EVENT_LABELS: Readonly<Record<EventType, string>> = {
  wedding: 'wedding',
  birthday: 'birthday',
  community: 'community event',
};

/** Whole-unit currency formatting. Fixed locale so server and client output match. */
export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Formats a YYYY-MM-DD string without any local-timezone shift. */
export function formatDate(isoDate: string): string {
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeZone: 'UTC' }).format(
    new Date(`${isoDate}T00:00:00Z`),
  );
}

export function pluralize(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`;
}
