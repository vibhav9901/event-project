import { describe, expect, it } from 'vitest';
import { interpretResponse } from '../../src/lib/api-client';

describe('interpretResponse', () => {
  it('passes a successful plan through', () => {
    const body = { plan: { eventType: 'wedding' }, ideas: null, aiStatus: 'disabled' };
    const outcome = interpretResponse(200, body, null);
    expect(outcome.kind).toBe('success');
  });

  it('maps server issues to friendly per-field messages', () => {
    const body = {
      error: {
        code: 'invalid_input',
        issues: [
          { path: 'guestCount', code: 'too_big' },
          { path: 'nope', code: 'x' },
        ],
      },
    };
    const outcome = interpretResponse(400, body, null);
    expect(outcome.kind).toBe('field-errors');
    if (outcome.kind === 'field-errors') {
      expect(Object.keys(outcome.fields)).toEqual(['guestCount']);
    }
  });

  it('attaches a date problem to the date field', () => {
    const outcome = interpretResponse(400, { error: { code: 'invalid_date', message: 'x' } }, null);
    expect(outcome.kind === 'field-errors' && Object.keys(outcome.fields)).toEqual(['eventDate']);
  });

  it('reports how long to wait when rate limited', () => {
    const outcome = interpretResponse(429, { error: { code: 'rate_limited' } }, '12');
    expect(outcome.kind === 'rate-limited' && outcome.message).toContain('12 seconds');
  });

  it.each([
    [500, { error: { code: 'internal_error' } }],
    [400, { error: { code: 'invalid_json' } }],
    [200, null],
    [502, 'not json'],
  ])('falls back to a generic error for status %s', (status, body) => {
    expect(interpretResponse(status, body, null).kind).toBe('error');
  });

  it('never surfaces raw server text to the user', () => {
    const outcome = interpretResponse(500, { error: { message: 'stack trace at db.ts:42' } }, null);
    expect(JSON.stringify(outcome)).not.toContain('db.ts');
  });
});
