/**
 * Unit tests for feedback-validation.ts (pure validation helpers).
 *
 * Tests cover:
 *  - Valid payloads return ok: true with normalised fields.
 *  - Invalid / missing type rejected.
 *  - Empty / oversized message rejected.
 *  - Optional email: absent → ok; valid → ok; malformed / oversized → rejected.
 *  - pageUrl and site are accepted as optional strings (capped).
 *  - Non-object bodies (array, string, null) rejected.
 */

import { describe, it, expect } from 'vitest';
import {
  validateFeedback,
  FEEDBACK_TYPES,
  type FeedbackType,
} from '../feedback-validation';

const VALID_BASE = {
  type: 'bug',
  message: 'The chart does not render on Safari.',
  email: 'user@example.com',
  pageUrl: '/calculator',
  site: 'gofirepath.com',
};

describe('validateFeedback — valid payloads', () => {
  it('returns ok:true for a fully valid payload', () => {
    const result = validateFeedback(VALID_BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.type).toBe('bug');
    expect(result.payload.message).toBe(VALID_BASE.message);
    expect(result.payload.email).toBe(VALID_BASE.email);
    expect(result.payload.pageUrl).toBe('/calculator');
    expect(result.payload.site).toBe('gofirepath.com');
  });

  it('accepts all valid type values', () => {
    for (const t of FEEDBACK_TYPES) {
      const r = validateFeedback({ ...VALID_BASE, type: t });
      expect(r.ok, `type=${t} should pass`).toBe(true);
    }
  });

  it('trims whitespace from message', () => {
    const r = validateFeedback({ ...VALID_BASE, message: '  hello  ' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.message).toBe('hello');
  });

  it('accepts message of exactly 2000 chars', () => {
    const r = validateFeedback({ ...VALID_BASE, message: 'A'.repeat(2000) });
    expect(r.ok).toBe(true);
  });

  it('accepts payload without email (undefined)', () => {
    const { email: _email, ...noEmail } = VALID_BASE;
    const r = validateFeedback(noEmail);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.email).toBe('');
  });

  it('accepts payload with empty-string email', () => {
    const r = validateFeedback({ ...VALID_BASE, email: '' });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.payload.email).toBe('');
  });

  it('accepts a valid subdomain email', () => {
    const r = validateFeedback({ ...VALID_BASE, email: 'me@mail.example.co.uk' });
    expect(r.ok).toBe(true);
  });

  it('accepts payload without pageUrl and site', () => {
    const { pageUrl: _pu, site: _s, ...bare } = VALID_BASE;
    const r = validateFeedback(bare);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.payload.pageUrl).toBe('');
      expect(r.payload.site).toBe('');
    }
  });
});

describe('validateFeedback — invalid type', () => {
  it('rejects missing type', () => {
    const { type: _t, ...noType } = VALID_BASE;
    const r = validateFeedback(noType);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/type/i);
  });

  it('rejects empty string type', () => {
    const r = validateFeedback({ ...VALID_BASE, type: '' });
    expect(r.ok).toBe(false);
  });

  it('rejects unknown type value', () => {
    const r = validateFeedback({ ...VALID_BASE, type: 'spam' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/type/i);
  });
});

describe('validateFeedback — message validation', () => {
  it('rejects empty message', () => {
    const r = validateFeedback({ ...VALID_BASE, message: '' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/message/i);
  });

  it('rejects whitespace-only message (trims to empty)', () => {
    const r = validateFeedback({ ...VALID_BASE, message: '   ' });
    expect(r.ok).toBe(false);
  });

  it('rejects message exceeding 2000 chars', () => {
    const r = validateFeedback({ ...VALID_BASE, message: 'B'.repeat(2001) });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/message/i);
  });

  it('rejects missing message field', () => {
    const { message: _m, ...noMsg } = VALID_BASE;
    const r = validateFeedback(noMsg);
    expect(r.ok).toBe(false);
  });
});

describe('validateFeedback — email validation', () => {
  it('rejects email without @', () => {
    const r = validateFeedback({ ...VALID_BASE, email: 'notanemail' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/email/i);
  });

  it('rejects email without domain', () => {
    const r = validateFeedback({ ...VALID_BASE, email: 'user@' });
    expect(r.ok).toBe(false);
  });

  it('rejects email without TLD', () => {
    const r = validateFeedback({ ...VALID_BASE, email: 'user@domain' });
    expect(r.ok).toBe(false);
  });

  it('rejects email exceeding 254 chars', () => {
    // 255-char email: local part padded to 250 + @a.co
    const long = 'x'.repeat(250) + '@a.co';
    expect(long.length).toBeGreaterThan(254);
    const r = validateFeedback({ ...VALID_BASE, email: long });
    expect(r.ok).toBe(false);
  });

  it('accepts valid email with 254 chars', () => {
    // Construct exactly 254: local=249 + @a.co(5) = 254
    const local = 'x'.repeat(249);
    const addr = `${local}@a.co`;
    expect(addr.length).toBe(254);
    const r = validateFeedback({ ...VALID_BASE, email: addr });
    expect(r.ok).toBe(true);
  });
});

describe('validateFeedback — non-object body', () => {
  it('rejects null', () => {
    const r = validateFeedback(null);
    expect(r.ok).toBe(false);
  });

  it('rejects an array', () => {
    const r = validateFeedback([VALID_BASE]);
    expect(r.ok).toBe(false);
  });

  it('rejects a plain string', () => {
    const r = validateFeedback('{"type":"bug","message":"x"}');
    expect(r.ok).toBe(false);
  });

  it('rejects a number', () => {
    const r = validateFeedback(42);
    expect(r.ok).toBe(false);
  });
});
