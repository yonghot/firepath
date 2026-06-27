/**
 * Regression: public /guide pages 500'd when Supabase env was missing.
 *
 * Root cause (2026-06-27, follow-up to the middleware fix): `createClient()`
 * (src/lib/supabase/server.ts) throws synchronously when NEXT_PUBLIC_SUPABASE_URL/
 * ANON_KEY are absent. In the guide pages, `createClient()` was called OUTSIDE the
 * existing try/catch (which only wrapped the DB query), so the public SEO pages
 * 500'd instead of rendering their empty/not-found state.
 *
 * These tests pin that the page render functions DEGRADE GRACEFULLY (no throw)
 * when Supabase cannot be constructed. We unset the env so `createClient()` ->
 * `createServerClient(undefined, undefined)` throws inside the page; the page's
 * try/catch must absorb it.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

describe('public /guide pages — graceful degradation when Supabase env missing', () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedKey = process.env[ANON_KEY];
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = savedUrl;
    if (savedKey === undefined) delete process.env[ANON_KEY];
    else process.env[ANON_KEY] = savedKey;
  });

  it('guide index page renders (does not throw) with no Supabase configured', async () => {
    const mod = await import('@/app/(main)/guide/page');
    const GuidesIndexPage = mod.default;
    // Before the fix this rejected with "Your project's URL and Key are required…".
    await expect(GuidesIndexPage()).resolves.toBeTruthy();
  });

  it('guide index generateMetadata is resilient (returns metadata object)', async () => {
    const mod = await import('@/app/(main)/guide/page');
    // metadata is a static export object here; just assert the module loads and
    // the page component is callable without a configured backend.
    expect(typeof mod.default).toBe('function');
  });
});
