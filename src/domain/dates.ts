/** UTC-only date helpers. Avoids local-timezone and DST off-by-one bugs. */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 86_400_000;

/** Parses a strict YYYY-MM-DD string. Returns null for malformed or impossible dates. */
export function parseIsoDate(value: string): Date | null {
  const match = ISO_DATE.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  const roundTrips =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return roundTrips ? date : null;
}

export function formatIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/** Midnight UTC of the given instant. `now` is injectable for deterministic tests. */
export function utcToday(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}
