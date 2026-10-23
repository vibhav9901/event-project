import { describe, expect, it } from 'vitest';
import { EVENT_TYPES } from '../../src/domain/types';
import { planVendors } from '../../src/domain/vendors';

const ids = (type: 'wedding' | 'birthday' | 'community', guests: number) =>
  planVendors(type, guests).map((vendor) => vendor.id);

describe('planVendors', () => {
  it('adds parking only for large weddings', () => {
    expect(ids('wedding', 149)).not.toContain('parking');
    expect(ids('wedding', 150)).toContain('parking');
  });

  it('adds first-aid stewards for community events of 100+', () => {
    expect(ids('community', 99)).not.toContain('first-aid');
    expect(ids('community', 100)).toContain('first-aid');
  });

  it.each(EVENT_TYPES)('%s: every vendor has an essential item and a key question', (type) => {
    const vendors = planVendors(type, 500);
    expect(vendors.some((vendor) => vendor.priority === 'essential')).toBe(true);
    expect(vendors.every((vendor) => vendor.keyQuestion.length > 10)).toBe(true);
  });

  it('does not leak internal filtering fields', () => {
    expect('minGuests' in (planVendors('wedding', 500)[0] ?? {})).toBe(false);
  });
});
