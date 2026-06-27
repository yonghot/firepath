/**
 * Regression: API routes 500'd (raw INTERNAL_ERROR) when Supabase env was missing,
 * because requireAuth() -> createClient() threw a generic Error that handleApiError
 * mapped to 500. They should instead surface a clean 503 SERVICE_UNAVAILABLE.
 *
 * requireAuth() now guards isSupabaseConfigured() BEFORE createClient(), so this is
 * testable without a Next request context (no cookies() call is reached).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { requireAuth } from '@/lib/utils/api-handler';
import { AppError } from '@/constants/error-codes';

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

describe('requireAuth — clean 503 when Supabase env missing (regression)', () => {
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

  it('throws AppError SERVICE_UNAVAILABLE (503), not a raw 500', async () => {
    await expect(requireAuth()).rejects.toBeInstanceOf(AppError);
    await expect(requireAuth()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
      status: 503,
    });
  });
});
