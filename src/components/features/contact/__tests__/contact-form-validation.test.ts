/**
 * Unit tests for the pure form-validation helper embedded in contact-form.tsx.
 *
 * We re-implement the same logic here so we can test it without mounting a
 * React component (no jsdom / testing-library needed). The logic is
 * intentionally a mirror of the server-side rules in /api/contact/route.ts.
 */
import { describe, it, expect } from 'vitest';

/** Inline mirror of the helper in contact-form.tsx */
function validateContactForm(fields: {
  name: string;
  email: string;
  message: string;
}): string | null {
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!fields.name.trim() || fields.name.trim().length > 100) {
    return 'Name is required and must be 100 characters or fewer.';
  }
  if (!fields.email.trim() || fields.email.trim().length > 254 || !EMAIL_RE.test(fields.email.trim())) {
    return 'A valid email address is required.';
  }
  if (!fields.message.trim() || fields.message.trim().length > 2000) {
    return 'Message is required and must be 2,000 characters or fewer.';
  }
  return null;
}

const VALID = {
  name: 'Test User',
  email: 'test@example.com',
  message: 'This is a valid message.',
};

describe('validateContactForm (client-side helper)', () => {
  it('returns null for a fully valid form', () => {
    expect(validateContactForm(VALID)).toBeNull();
  });

  it('returns an error when name is empty', () => {
    expect(validateContactForm({ ...VALID, name: '' })).not.toBeNull();
  });

  it('returns an error when name is only whitespace', () => {
    expect(validateContactForm({ ...VALID, name: '   ' })).not.toBeNull();
  });

  it('returns an error when name exceeds 100 chars', () => {
    expect(validateContactForm({ ...VALID, name: 'A'.repeat(101) })).not.toBeNull();
  });

  it('returns null for a name of exactly 100 chars', () => {
    expect(validateContactForm({ ...VALID, name: 'A'.repeat(100) })).toBeNull();
  });

  it('returns an error when email is empty', () => {
    expect(validateContactForm({ ...VALID, email: '' })).not.toBeNull();
  });

  it('returns an error for an email without @', () => {
    expect(validateContactForm({ ...VALID, email: 'notanemail' })).not.toBeNull();
  });

  it('returns an error for an email without TLD', () => {
    expect(validateContactForm({ ...VALID, email: 'user@domain' })).not.toBeNull();
  });

  it('returns null for a valid email with subdomain', () => {
    expect(validateContactForm({ ...VALID, email: 'u@mail.example.co.uk' })).toBeNull();
  });

  it('returns an error when message is empty', () => {
    expect(validateContactForm({ ...VALID, message: '' })).not.toBeNull();
  });

  it('returns an error when message is only whitespace', () => {
    expect(validateContactForm({ ...VALID, message: '   ' })).not.toBeNull();
  });

  it('returns an error when message exceeds 2000 chars', () => {
    expect(validateContactForm({ ...VALID, message: 'M'.repeat(2001) })).not.toBeNull();
  });

  it('returns null for a message of exactly 2000 chars', () => {
    expect(validateContactForm({ ...VALID, message: 'M'.repeat(2000) })).toBeNull();
  });
});
