import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';

/**
 * Server-side "is the current user premium?" helper.
 *
 * SERVER-ONLY by convention (mirrors src/lib/supabase/server.ts, which also
 * omits the `server-only` package). It imports the supabase server client, which
 * uses next/headers — so it can never run on the client anyway. We avoid the
 * `server-only` import because it is not resolvable in the vitest environment
 * and the repo does not depend on it.
 *
 * Single source of truth for gating BOTH ad rendering (free = ads, premium =
 * ad-free) and premium-only features. Reads the subscription status that the
 * Stripe webhook upserts into Supabase.
 *
 * Fully env-guarded: with no Supabase configured (the free build), every user
 * is treated as non-premium and the function never throws — the free,
 * ad-supported experience keeps working.
 *
 * "Premium" = an authenticated user whose subscription row has an entitling
 * status ('active' | 'trialing'). The `profiles.subscription_tier` column is a
 * convenience mirror the webhook also maintains; we treat the subscriptions
 * table as authoritative but fall back to the profile tier if present.
 */

const ACTIVE_STATUSES = new Set(['active', 'trialing']);

export interface PremiumStatus {
  isPremium: boolean;
  userId: string | null;
  status: string | null;
  currentPeriodEnd: string | null;
}

const ANONYMOUS: PremiumStatus = {
  isPremium: false,
  userId: null,
  status: null,
  currentPeriodEnd: null,
};

/**
 * Resolve the current request's premium status. Safe to call from Server
 * Components and route handlers. Never throws — failures degrade to non-premium.
 */
export async function getPremiumStatus(): Promise<PremiumStatus> {
  // No backend configured → free build, everyone sees ads, no premium gating.
  if (!isSupabaseConfigured()) return ANONYMOUS;

  // createClient() (→ cookies()) is intentionally OUTSIDE the try/catch: wrapping
  // it would swallow Next's static→dynamic bailout. Only the DB/auth queries are
  // guarded. See docs/PROGRESS.md → "인시던트 로그".
  const supabase = await createClient();

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return ANONYMOUS;

    // Subscriptions table is authoritative.
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('status, current_period_end')
      .eq('user_id', user.id)
      .maybeSingle();

    if (sub && ACTIVE_STATUSES.has(sub.status)) {
      return {
        isPremium: true,
        userId: user.id,
        status: sub.status,
        currentPeriodEnd: sub.current_period_end ?? null,
      };
    }

    // Fall back to the mirrored profile tier (kept in sync by the webhook).
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    const isPremium = profile?.subscription_tier === 'premium';
    return {
      isPremium,
      userId: user.id,
      status: sub?.status ?? (isPremium ? 'active' : null),
      currentPeriodEnd: sub?.current_period_end ?? null,
    };
  } catch {
    // DB unreachable / transient error — never block the page; treat as free.
    return ANONYMOUS;
  }
}

/** Convenience boolean wrapper. */
export async function isCurrentUserPremium(): Promise<boolean> {
  return (await getPremiumStatus()).isPremium;
}
