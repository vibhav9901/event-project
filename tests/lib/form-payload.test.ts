import { describe, expect, it } from 'vitest';
import { toPayload } from '../../src/lib/form-payload';

describe('toPayload', () => {
  it('converts numeric fields and keeps text as typed', () => {
    const data = new FormData();
    data.set('eventType', 'birthday');
    data.set('guestCount', '25');
    data.set('totalBudget', '1500');
    data.set('currency', 'EUR');
    data.set('eventDate', '2027-03-14');
    data.set('location', 'Lisbon');
    data.set('preferences', 'jazz');
    expect(toPayload(data)).toEqual({
      eventType: 'birthday',
      guestCount: 25,
      totalBudget: 1500,
      currency: 'EUR',
      eventDate: '2027-03-14',
      location: 'Lisbon',
      preferences: 'jazz',
    });
  });

  it('turns missing fields into values the server will reject', () => {
    const payload = toPayload(new FormData());
    expect(payload.guestCount).toBe(0);
    expect(payload.eventType).toBe('');
  });
});
