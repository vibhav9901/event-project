import { describe, expect, it } from 'vitest';
import { formatDate, formatMoney, pluralize } from '../../src/lib/format';

describe('format', () => {
  it('formats whole-unit money', () => {
    expect(formatMoney(12345, 'USD')).toBe('$12,345');
  });

  it('formats dates without timezone drift', () => {
    expect(formatDate('2027-01-01')).toBe('Jan 1, 2027');
  });

  it('pluralises counts', () => {
    expect(pluralize(1, 'day')).toBe('1 day');
    expect(pluralize(0, 'day')).toBe('0 days');
    expect(pluralize(2, 'guest')).toBe('2 guests');
  });
});
