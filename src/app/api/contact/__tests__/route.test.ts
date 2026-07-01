/**
 * Unit tests for POST /api/contact.
 *
 * Tests cover:
 * - Valid submission returns 200 { ok: true }
 * - Missing / empty fields return 400
 * - Oversized fields return 400
 * - Invalid email format returns 400
 * - Non-JSON body returns 400
 */
import { describe, it, expect } from 'vitest';
import { POST } from '../route';

/** Build a minimal Request-like object that satisfies the route handler. */
function makeRequest(body: unknown, contentType = 'application/json'): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': contentType },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

const VALID = {
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  message: 'Hello, I have a question about Coast FIRE.',
};

describe('POST /api/contact', () => {
  // ── Valid submission ────────────────────────────────────────────────────────
  it('returns 200 { ok: true } for a valid submission', async () => {
    const res = await POST(makeRequest(VALID));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data).toEqual({ ok: true });
  });

  it('trims whitespace from fields before validating', async () => {
    const res = await POST(makeRequest({
      name: '  Ada  ',
      email: '  ada@example.com  ',
      message: '  Hello world  ',
    }));
    expect(res.status).toBe(200);
  });

  // ── Missing fields ──────────────────────────────────────────────────────────
  it('returns 400 when name is missing', async () => {
    const res = await POST(makeRequest({ ...VALID, name: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
    expect(typeof data.error).toBe('string');
  });

  it('returns 400 when email is missing', async () => {
    const res = await POST(makeRequest({ ...VALID, email: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 when message is missing', async () => {
    const res = await POST(makeRequest({ ...VALID, message: '' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 when all fields are absent', async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  // ── Oversized fields ────────────────────────────────────────────────────────
  it('returns 400 when name exceeds 100 chars', async () => {
    const longName = 'A'.repeat(101);
    const res = await POST(makeRequest({ ...VALID, name: longName }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('accepts name of exactly 100 chars', async () => {
    const maxName = 'A'.repeat(100);
    const res = await POST(makeRequest({ ...VALID, name: maxName }));
    expect(res.status).toBe(200);
  });

  it('returns 400 when message exceeds 2000 chars', async () => {
    const longMessage = 'M'.repeat(2001);
    const res = await POST(makeRequest({ ...VALID, message: longMessage }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('accepts message of exactly 2000 chars', async () => {
    const maxMessage = 'M'.repeat(2000);
    const res = await POST(makeRequest({ ...VALID, message: maxMessage }));
    expect(res.status).toBe(200);
  });

  // ── Invalid email ───────────────────────────────────────────────────────────
  it('returns 400 for email without @', async () => {
    const res = await POST(makeRequest({ ...VALID, email: 'notanemail' }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 for email without domain', async () => {
    const res = await POST(makeRequest({ ...VALID, email: 'user@' }));
    expect(res.status).toBe(400);
  });

  it('returns 400 for email without TLD', async () => {
    const res = await POST(makeRequest({ ...VALID, email: 'user@domain' }));
    expect(res.status).toBe(400);
  });

  it('accepts a valid email with subdomain', async () => {
    const res = await POST(makeRequest({ ...VALID, email: 'user@mail.example.co.uk' }));
    expect(res.status).toBe(200);
  });

  // ── Malformed body ──────────────────────────────────────────────────────────
  it('returns 400 for non-JSON body', async () => {
    const res = await POST(makeRequest('this is not json', 'text/plain'));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.ok).toBe(false);
  });

  it('returns 400 when body is a JSON array (not an object)', async () => {
    const res = await POST(makeRequest([VALID.name, VALID.email, VALID.message]));
    expect(res.status).toBe(400);
  });

  it('returns 400 when body is a JSON string (not an object)', async () => {
    const req = new Request('http://localhost/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify('just a string'),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
