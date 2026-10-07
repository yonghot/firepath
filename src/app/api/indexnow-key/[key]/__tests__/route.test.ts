/**
 * Unit tests for GET /api/indexnow-key/{key} — the IndexNow key verification
 * route (부속I T14), reached through the next.config.ts rewrite from /{key}.txt.
 *
 * Acceptance criteria: "curl https://{domain}/{key}.txt returns the key" and
 * (implicitly) every other path 404s — this dynamic segment must not become
 * an open wildcard route. The rewrite strips ".txt", so the param is the bare
 * key.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { GET } from '../route';

const ORIGINAL_KEY = process.env.INDEXNOW_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = ORIGINAL_KEY;
});

function makeParams(key: string) {
  return { params: Promise.resolve({ key }) };
}

describe('GET /api/indexnow-key/[key] — INDEXNOW_KEY unset', () => {
  it('404s for any path when INDEXNOW_KEY is unset', async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await GET(new Request('http://localhost/anything.txt'), makeParams('anything'));
    expect(res.status).toBe(404);
  });
});

describe('GET /api/indexnow-key/[key] — INDEXNOW_KEY set', () => {
  it('returns 200 with the bare key when the segment equals the key exactly', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/abc123def456.txt'), makeParams('abc123def456'));
    expect(res.status).toBe(200);
    const body = await res.text();
    expect(body).toBe('abc123def456');
    expect(res.headers.get('content-type')).toContain('text/plain');
  });

  it('404s for any OTHER path — not an open wildcard route', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/about'), makeParams('about'));
    expect(res.status).toBe(404);
  });

  it('404s when the segment still carries the .txt suffix (the rewrite already removed it)', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/abc123def456.txt'), makeParams('abc123def456.txt'));
    expect(res.status).toBe(404);
  });

  it('404s for a path with the wrong key value', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/wrongkey.txt'), makeParams('wrongkey'));
    expect(res.status).toBe(404);
  });
});
