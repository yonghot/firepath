/**
 * Regression: MIDDLEWARE_INVOCATION_FAILED (HTTP 500) in Vercel production.
 *
 * Root cause (2026-06-27): NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY
 * were absent in the Vercel build. `@supabase/ssr` createServerClient throws
 * synchronously on a falsy URL/key, and `updateSession()` had no guard/try-catch,
 * so the throw propagated as MIDDLEWARE_INVOCATION_FAILED on every matched route.
 *
 * These tests pin the graceful-degradation behavior: when Supabase is
 * unconfigured or misconfigured, the middleware must PASS THE REQUEST THROUGH
 * (return a 200 NextResponse) instead of throwing. Before the fix, every case
 * below threw "Your project's URL and Key are required to create a Supabase client!".
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

describe('updateSession — missing/malformed Supabase env (regression)', () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedKey = process.env[ANON_KEY];
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = savedUrl;
    if (savedKey === undefined) delete process.env[ANON_KEY];
    else process.env[ANON_KEY] = savedKey;
  });

  const req = () => new NextRequest('https://firepath-ten.vercel.app/');

  it('does not throw and returns a 200 passthrough when env vars are MISSING', async () => {
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];

    const res = await updateSession(req());

    expect(res).toBeDefined();
    expect(res.status).toBe(200);
  });

  it('does not throw when env vars are whitespace-only (trim → empty)', async () => {
    process.env[URL_KEY] = '   ';
    process.env[ANON_KEY] = '\n';

    const res = await updateSession(req());

    expect(res.status).toBe(200);
  });

  it('does not throw when the Supabase URL is malformed (new URL() would throw)', async () => {
    process.env[URL_KEY] = 'not-a-valid-url';
    process.env[ANON_KEY] = 'some-anon-key';

    const res = await updateSession(req());

    expect(res.status).toBe(200);
  });
});
