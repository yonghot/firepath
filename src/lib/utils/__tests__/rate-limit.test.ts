/**
 * rate-limit.ts — unit tests (부속I T17 acceptance criteria: "rate-limit the API route").
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import { checkRateLimit, getClientIp } from '@/lib/utils/rate-limit';

describe('getClientIp', () => {
  it('reads the first IP from x-forwarded-for', () => {
    const req = new Request('https://example.com', {
      headers: { 'x-forwarded-for': '203.0.113.5, 70.41.3.18' },
    });
    expect(getClientIp(req)).toBe('203.0.113.5');
  });

  it('falls back to x-real-ip when x-forwarded-for is absent', () => {
    const req = new Request('https://example.com', { headers: { 'x-real-ip': '198.51.100.9' } });
    expect(getClientIp(req)).toBe('198.51.100.9');
  });

  it('returns "unknown" when neither header is present', () => {
    const req = new Request('https://example.com');
    expect(getClientIp(req)).toBe('unknown');
  });
});

describe('checkRateLimit', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows requests up to the limit within the window', () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, { limit: 5, windowMs: 60_000 })).toBe(true);
    }
  });

  it('rejects the request once the limit is exceeded within the window', () => {
    const key = `test-key-${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    }
    expect(checkRateLimit(key, { limit: 5, windowMs: 60_000 })).toBe(false);
  });

  it('resets the count after the window elapses', () => {
    const key = `test-key-${Math.random()}`;
    const nowSpy = vi.spyOn(Date, 'now');

    nowSpy.mockReturnValue(1_000_000);
    for (let i = 0; i < 5; i++) {
      checkRateLimit(key, { limit: 5, windowMs: 60_000 });
    }
    expect(checkRateLimit(key, { limit: 5, windowMs: 60_000 })).toBe(false);

    // Advance past the window.
    nowSpy.mockReturnValue(1_000_000 + 60_001);
    expect(checkRateLimit(key, { limit: 5, windowMs: 60_000 })).toBe(true);
  });

  it('tracks distinct keys independently', () => {
    const keyA = `test-key-a-${Math.random()}`;
    const keyB = `test-key-b-${Math.random()}`;
    for (let i = 0; i < 5; i++) checkRateLimit(keyA, { limit: 5, windowMs: 60_000 });
    expect(checkRateLimit(keyA, { limit: 5, windowMs: 60_000 })).toBe(false);
    expect(checkRateLimit(keyB, { limit: 5, windowMs: 60_000 })).toBe(true);
  });
});
