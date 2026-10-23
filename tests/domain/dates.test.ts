import { describe, expect, it } from 'vitest';
import {
  addDays,
  daysBetween,
  formatIsoDate,
  parseIsoDate,
  utcToday,
} from '../../src/domain/dates';

describe('dates', () => {
  it('parses a valid ISO date', () => {
    expect(formatIsoDate(parseIsoDate('2026-12-31') as Date)).toBe('2026-12-31');
  });

  it.each(['2026-02-30', '2026-13-01', '26-01-01', '2026/01/01', '', '0000-01-01'])(
    'rejects %s',
    (value) => {
      expect(parseIsoDate(value)).toBeNull();
    },
  );

  it('accepts Feb 29 only in leap years', () => {
    expect(parseIsoDate('2028-02-29')).not.toBeNull();
    expect(parseIsoDate('2027-02-29')).toBeNull();
  });

  it('computes whole-day differences across DST-sensitive ranges', () => {
    const from = parseIsoDate('2026-03-01') as Date;
    expect(daysBetween(from, addDays(from, 45))).toBe(45);
    expect(daysBetween(addDays(from, 5), from)).toBe(-5);
  });

  it('normalises "now" to midnight UTC', () => {
    expect(formatIsoDate(utcToday(new Date('2026-10-22T23:59:59Z')))).toBe('2026-10-22');
  });
});
