import { describe, expect, it } from 'vitest';
import { planInputSchema } from '../../src/domain/schema';

const valid = {
  eventType: 'birthday',
  guestCount: 25,
  totalBudget: 1500,
  currency: 'EUR',
  eventDate: '2027-03-14',
};

describe('planInputSchema', () => {
  it('applies defaults for optional text fields', () => {
    const result = planInputSchema.parse(valid);
    expect(result.location).toBe('');
    expect(result.preferences).toBe('');
  });

  it.each([
    ['unknown keys', { ...valid, admin: true }],
    ['zero guests', { ...valid, guestCount: 0 }],
    ['too many guests', { ...valid, guestCount: 2001 }],
    ['fractional guests', { ...valid, guestCount: 2.5 }],
    ['string budget', { ...valid, totalBudget: '1500' }],
    ['unknown event type', { ...valid, eventType: 'funeral' }],
    ['impossible date', { ...valid, eventDate: '2027-02-30' }],
    ['oversized preferences', { ...valid, preferences: 'x'.repeat(501) }],
  ])('rejects %s', (_label, payload) => {
    expect(planInputSchema.safeParse(payload).success).toBe(false);
  });

  it('strips control characters and trims free text', () => {
    const result = planInputSchema.parse({ ...valid, preferences: '  vegan\u0000 menu\u0007  ' });
    expect(result.preferences).toBe('vegan menu');
  });
});
