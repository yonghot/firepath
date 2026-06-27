'use client';

import { useEffect, useState } from 'react';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  // Only "loading" when there's a configured client to query; otherwise the
  // user is simply signed-out. Initializing from isSupabaseConfigured() avoids a
  // synchronous setState inside the effect (react-hooks/set-state-in-effect).
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    // If Supabase isn't configured, stay signed-out instead of letting
    // createClient() throw — an unguarded throw here crashes every page into
    // error.tsx. See docs/PROGRESS.md → "인시던트 로그" [2026-06-28].
    if (!isSupabaseConfigured()) return;

    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
  };

  return { user, loading, signOut };
}
