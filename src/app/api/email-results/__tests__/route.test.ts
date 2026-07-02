/**
 * Unit tests for POST /api/email-results (부속I T17 acceptance criteria).
 *
 * Covers:
 *  - Valid submission returns 200 { ok: true }.
 *  - Zod validation: invalid email / missing calc_type / invalid share_url → 400.
 *  - Malformed JSON → 400.
 *  - marketingOptIn defaults to false when omitted.
 *  - When EMAIL_CAPTURE_ENDPOINT is unset → fetch is NOT called (dark no-op).
 *  - When EMAIL_CAPTURE_ENDPOINT is set → fetch IS called with the transactional payload.
 *  - External fetch failure → still returns 200 { ok: true } (user not blocked).
 *  - Per-IP rate limiting → 429 after the limit is exceeded.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

function makeRequest(body: unknown, ip = `203.0.113.${Math.floor(Math.random() * 250) + 1}`): Request {
  const raw = typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('http://localhost/api/email-results', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': ip },
    body: raw,
  });
}

const VALID = {
  email: 'user@example.com',
  calc_type: 'fire_timeline',
  share_url: 'https://gofirepath.com/result#a=35',
};

describe('POST /api/email-results — valid payloads', () => {
  it('returns 200 { ok: true } for a valid payload', async () => {
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it('accepts marketingOptIn explicitly true/false', async () => {
    const res1 = await POST(makeRequest({ ...VALID, marketingOptIn: true }));
    expect(res1.status).toBe(200);
    const res2 = await POST(makeRequest({ ...VALID, marketingOptIn: false }));
    expect(res2.status).toBe(200);
  });
});

describe('POST /api/email-results — validation errors', () => {
  it('returns 400 for invalid email', async () => {
    const res = await POST(makeRequest({ ...VALID, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 for missing calc_type', async () => {
    const { calc_type: _c, ...rest } = VALID;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
  });

  it('returns 400 for invalid share_url', async () => {
    const res = await POST(makeRequest({ ...VALID, share_url: 'not-a-url' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for malformed JSON body', async () => {
    const res = await POST(makeRequest('not json'));
    expect(res.status).toBe(400);
  });

  it('returns 400 for an email exceeding 254 chars', async () => {
    const longEmail = `${'a'.repeat(250)}@example.com`;
    const res = await POST(makeRequest({ ...VALID, email: longEmail }));
    expect(res.status).toBe(400);
  });
});

describe('POST /api/email-results — EMAIL_CAPTURE_ENDPOINT behaviour', () => {
  const originalFetch = global.fetch;
  const originalEndpoint = process.env.EMAIL_CAPTURE_ENDPOINT;
  const originalKey = process.env.EMAIL_CAPTURE_API_KEY;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEndpoint === undefined) delete process.env.EMAIL_CAPTURE_ENDPOINT;
    else process.env.EMAIL_CAPTURE_ENDPOINT = originalEndpoint;
    if (originalKey === undefined) delete process.env.EMAIL_CAPTURE_API_KEY;
    else process.env.EMAIL_CAPTURE_API_KEY = originalKey;
  });

  it('does NOT call fetch when EMAIL_CAPTURE_ENDPOINT is unset', async () => {
    delete process.env.EMAIL_CAPTURE_ENDPOINT;
    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch with a transactional-only payload when EMAIL_CAPTURE_ENDPOINT is set', async () => {
    process.env.EMAIL_CAPTURE_ENDPOINT = 'https://esp.example.com/subscribers';
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = mockFetch;

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('https://esp.example.com/subscribers');
    const sentBody = JSON.parse((init as RequestInit).body as string);
    expect(sentBody.email).toBe(VALID.email);
    expect(sentBody.share_url).toBe(VALID.share_url);
    expect(sentBody.marketingOptIn).toBe(false);
    // Transactional-only: no promotional copy field exists in the payload shape.
    expect(Object.keys(sentBody).sort()).toEqual(
      ['calc_type', 'email', 'marketingOptIn', 'share_url', 'source'].sort()
    );
  });

  it('sends an Authorization header when EMAIL_CAPTURE_API_KEY is set', async () => {
    process.env.EMAIL_CAPTURE_ENDPOINT = 'https://esp.example.com/subscribers';
    process.env.EMAIL_CAPTURE_API_KEY = 'secret-key-123';
    const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    global.fetch = mockFetch;

    await POST(makeRequest(VALID));
    const [, init] = mockFetch.mock.calls[0];
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer secret-key-123');
  });

  it('still returns 200 when the ESP fetch fails', async () => {
    process.env.EMAIL_CAPTURE_ENDPOINT = 'https://esp.example.com/subscribers';
    global.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
  });
});

describe('POST /api/email-results — rate limiting', () => {
  it('returns 429 after exceeding the per-IP limit within the window', async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 250) + 1}`;
    let lastRes: Response | null = null;
    for (let i = 0; i < 6; i++) {
      lastRes = await POST(makeRequest(VALID, ip));
    }
    expect(lastRes?.status).toBe(429);
  });
});
