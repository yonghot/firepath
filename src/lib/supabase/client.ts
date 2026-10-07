'use client';

import { createBrowserClient } from '@supabase/ssr';

// Check before createClient(): createBrowserClient throws on a falsy URL/key and crashes the tree into error.tsx (PROGRESS 2026-06-28).
export { isSupabaseConfigured } from './config';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
