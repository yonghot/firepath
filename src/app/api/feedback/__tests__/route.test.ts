/**
 * Unit tests for POST /api/feedback route.
 *
 * Tests cover:
 *  - Valid submission returns 200 { ok: true }.
 *  - Invalid type / empty message / oversized message / invalid email → 400.
 *  - Malformed JSON → 400.
 *  - When FEEDBACK_ENDPOINT is unset → fetch is NOT called.
 *  - When FEEDBACK_ENDPOINT is set → fetch IS called with the record JSON.
 *  - External fetch failure → still returns 200 { ok: true } (user not blocked).
 *  - Body too large → 400.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(body: unknown, contentType = 'application/json'): Request {
  const raw =
    typeof body === 'string' ? body : JSON.stringify(body);
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      'content-length': String(Buffer.byteLength(raw, 'utf8')),
      'user-agent': 'vitest-test-agent',
    },
    body: raw,
  });
}

const VALID = {
  type: 'bug',
  message: 'The chart does not render on mobile Safari.',
  email: 'user@example.com',
  pageUrl: '/calculator',
  site: 'gofirepath.com',
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('POST /api/feedback — valid payloads', () => {
  it('returns 200 { ok: true } for a valid payload', async () => {
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it('returns 200 when email is omitted (optional field)', async () => {
    const { email: _e, ...noEmail } = VALID;
    const res = await POST(makeRequest(noEmail));
    expect(res.status).toBe(200);
  });

  it('returns 200 for all valid type values', async () => {
    for (const t of ['bug', 'feature', 'other']) {
      const res = await POST(makeRequest({ ...VALID, type: t }));
      expect(res.status, `type=${t}`).toBe(200);
    }
  });
});

describe('POST /api/feedback — validation errors', () => {
  it('returns 400 for invalid type', async () => {
    const res = await POST(makeRequest({ ...VALID, type: 'spam' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(typeof data.error).toBe('string');
  });

  it('returns 400 for empty message', async () => {
    const res = await POST(makeRequest({ ...VALID, message: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 for message exceeding 2000 chars', async () => {
    const res = await POST(makeRequest({ ...VALID, message: 'X'.repeat(2001) }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 for invalid email format', async () => {
    const res = await POST(makeRequest({ ...VALID, email: 'not-an-email' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 for malformed JSON body', async () => {
    const res = await POST(makeRequest('this is not json', 'text/plain'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 when body is a JSON array (not object)', async () => {
    const res = await POST(makeRequest([VALID]));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });
});

// ── Endpoint forwarding behaviour ─────────────────────────────────────────────

describe('POST /api/feedback — FEEDBACK_ENDPOINT behaviour', () => {
  const originalFetch = global.fetch;
  const originalEnv = process.env.FEEDBACK_ENDPOINT;

  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalEnv === undefined) {
      delete process.env.FEEDBACK_ENDPOINT;
    } else {
      process.env.FEEDBACK_ENDPOINT = originalEnv;
    }
  });

  it('does NOT call fetch when FEEDBACK_ENDPOINT is unset', async () => {
    delete process.env.FEEDBACK_ENDPOINT;

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch with the record when FEEDBACK_ENDPOINT is set', async () => {
    process.env.FEEDBACK_ENDPOINT = 'https://example.com/collect';

    const mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    global.fetch = mockFetch;

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/collect');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });

    // The forwarded body should include the validated fields + server-side metadata.
    const forwarded = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(forwarded.type).toBe('bug');
    expect(forwarded.message).toBe(VALID.message);
    expect(forwarded.email).toBe(VALID.email);
    expect(typeof forwarded.receivedAt).toBe('string');
    expect(typeof forwarded.userAgent).toBe('string');
  });

  it('returns 200 even when external fetch fails', async () => {
    process.env.FEEDBACK_ENDPOINT = 'https://example.com/collect';

    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);

    // Error should be logged server-side.
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
