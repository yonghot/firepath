/**
 * Unit tests for GET /{key}.txt — the IndexNow key verification route (부속I T14).
 *
 * Acceptance criteria: "curl https://{domain}/{key}.txt returns the key" and
 * (implicitly) every other path 404s — this dynamic segment must not become
 * an open wildcard route.
 */

import { describe, it, expect, afterEach } from 'vitest';
import { GET } from '../route';

const ORIGINAL_KEY = process.env.INDEXNOW_KEY;

afterEach(() => {
  if (ORIGINAL_KEY === undefined) delete process.env.INDEXNOW_KEY;
  else process.env.INDEXNOW_KEY = ORIGINAL_KEY;
});

function makeParams(indexnowKey: string) {
  return { params: Promise.resolve({ indexnowKey }) };
}

describe('GET /[indexnowKey] — INDEXNOW_KEY unset', () => {
  it('404s for any path when INDEXNOW_KEY is unset', async () => {
    delete process.env.INDEXNOW_KEY;
    const res = await GET(new Request('http://localhost/anything.txt'), makeParams('anything.txt'));
    expect(res.status).toBe(404);
  });
});

describe('GET /[indexnowKey] — INDEXNOW_KEY set', () => {
  it('returns 200 with the bare key when the path matches {key}.txt exactly', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/abc123def456.txt'), makeParams('abc123def456.txt'));
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

  it('404s for a path missing the .txt suffix', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/abc123def456'), makeParams('abc123def456'));
    expect(res.status).toBe(404);
  });

  it('404s for a path with the wrong key value', async () => {
    process.env.INDEXNOW_KEY = 'abc123def456';
    const res = await GET(new Request('http://localhost/wrongkey.txt'), makeParams('wrongkey.txt'));
    expect(res.status).toBe(404);
  });
});
