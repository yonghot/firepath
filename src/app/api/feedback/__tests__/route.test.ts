/**
 * Unit tests for POST /api/feedback route.
 *
 * Tests cover:
 *  - Valid submission returns 200 { ok: true } once the collector answers 2xx.
 *  - Invalid type / empty message / oversized message / invalid email → 400.
 *  - Malformed JSON → 400.
 *  - When FEEDBACK_ENDPOINT is unset → 503, fetch is NOT called.
 *  - When FEEDBACK_ENDPOINT is set → fetch IS called with the record JSON.
 *  - External fetch failure or non-2xx answer → 502 { ok: false } (a dropped message is never reported as received).
 *  - Body too large → 400.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '../route';

const COLLECTOR = 'https://example.com/collect';
const originalFetch = global.fetch;
const originalEndpoint = process.env.FEEDBACK_ENDPOINT;

beforeEach(() => {
  process.env.FEEDBACK_ENDPOINT = COLLECTOR;
  global.fetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
});

afterEach(() => {
  global.fetch = originalFetch;
  if (originalEndpoint === undefined) delete process.env.FEEDBACK_ENDPOINT;
  else process.env.FEEDBACK_ENDPOINT = originalEndpoint;
});

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
  it('refuses with 503 and does NOT call fetch when FEEDBACK_ENDPOINT is unset', async () => {
    delete process.env.FEEDBACK_ENDPOINT;

    const mockFetch = vi.fn();
    global.fetch = mockFetch;

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(503);
    expect((await res.json()).ok).toBe(false);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('calls fetch with the record when FEEDBACK_ENDPOINT is set', async () => {
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

  it('returns 502 { ok: false } when the external fetch fails, and logs the failure server-side', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'));
    global.fetch = mockFetch;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(502);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(typeof data.error).toBe('string');

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('returns 502 { ok: false } when the collector answers non-2xx', async () => {
    global.fetch = vi.fn().mockResolvedValue(new Response('boom', { status: 500 }));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(502);
    expect((await res.json()).ok).toBe(false);
    consoleSpy.mockRestore();
  });
});
