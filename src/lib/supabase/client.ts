'use client';

import { createBrowserClient } from '@supabase/ssr';

/**
 * True when the public Supabase env vars are present (NEXT_PUBLIC_* are inlined
 * into the client bundle at build time). Callers MUST check this before
 * createClient() — createBrowserClient throws synchronously on falsy URL/key,
 * which (e.g. from useAuth's useEffect) crashes the React tree into error.tsx.
 * See docs/PROGRESS.md → "인시던트 로그" [2026-06-28].
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
