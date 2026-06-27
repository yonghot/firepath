/**
 * Regression: every page crashed into error.tsx ("Something went wrong") when
 * Supabase env was missing, because useAuth's useEffect called the browser
 * createClient() -> createBrowserClient(undefined, undefined), which throws
 * synchronously; the unguarded throw in the effect bubbled to the root error
 * boundary on every (main)-layout page (Header mounts useAuth everywhere).
 *
 * The fix guards every browser-client call site with isSupabaseConfigured().
 * These tests pin that guard mechanism (the project has no React-testing-library,
 * so we verify the guard function + the dangerous throw it protects against,
 * rather than rendering the hook).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { isSupabaseConfigured, createClient } from '@/lib/supabase/client';

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

describe('browser supabase client guard (regression)', () => {
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

  it('isSupabaseConfigured() is false when env vars are missing (guard short-circuits useAuth)', () => {
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];
    expect(isSupabaseConfigured()).toBe(false);
  });

  it('isSupabaseConfigured() is true when both env vars are present', () => {
    process.env[URL_KEY] = 'https://example.supabase.co';
    process.env[ANON_KEY] = 'anon-key';
    expect(isSupabaseConfigured()).toBe(true);
  });

  it('createClient() throws when unconfigured — proving why callers MUST guard', () => {
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];
    // This is the exact throw that crashed useAuth's useEffect before the guard.
    expect(() => createClient()).toThrow();
  });
});
