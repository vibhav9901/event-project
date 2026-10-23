import { describe, expect, it } from 'vitest';
import { buildCsp } from '../../src/lib/csp';

describe('buildCsp', () => {
  const prod = buildCsp('abc123', false);

  it('uses the nonce and forbids inline/eval scripts in production', () => {
    expect(prod).toContain("'nonce-abc123'");
    expect(prod).not.toContain('unsafe-inline');
    expect(prod).not.toContain('unsafe-eval');
  });

  it('blocks framing, plugins and base-tag hijacking', () => {
    for (const directive of ["frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'"]) {
      expect(prod).toContain(directive);
    }
  });

  it('relaxes only what the dev server needs', () => {
    expect(buildCsp('abc123', true)).toContain("'unsafe-eval'");
  });
});
