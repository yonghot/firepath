import Stripe from 'stripe';

/**
 * Stripe server SDK — lazily and conditionally initialized.
 *
 * SERVER-ONLY: reads STRIPE_SECRET_KEY (a non-NEXT_PUBLIC secret), so it is
 * never inlined into the client bundle. We don't import the `server-only`
 * package (not a repo dependency / not resolvable under vitest), matching the
 * convention in src/lib/supabase/server.ts.
 *
 * Every Stripe surface in FIREPath is ENV-GUARDED: when STRIPE_SECRET_KEY is
 * absent (the default for the free, open-source build), `getStripe()` returns
 * null and callers degrade gracefully (the upgrade button stays "Coming Soon",
 * checkout/portal/webhook routes 503). The production build MUST still succeed
 * and the free site MUST keep working with no Stripe env vars set.
 *
 * Never throw at module load — that would break `next build`.
 */

let cached: Stripe | null = null;

/** True when the server-side Stripe secret key is configured. */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY?.trim());
}

/** True when a price id for the premium plan is configured. */
export function isPremiumPriceConfigured(): boolean {
  return Boolean(process.env.STRIPE_PREMIUM_PRICE_ID?.trim());
}

/**
 * Returns a memoized Stripe client, or null when STRIPE_SECRET_KEY is unset.
 * Callers MUST handle the null case (feature disabled).
 */
export function getStripe(): Stripe | null {
  if (!isStripeConfigured()) return null;
  if (cached) return cached;

  cached = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    // Pin via the account default API version (no literal) to avoid drift
    // between the installed SDK and a hardcoded string.
    typescript: true,
    appInfo: { name: 'FIREPath', url: 'https://firepath.app' },
  });
  return cached;
}

/** The configured premium price id, or null. */
export function getPremiumPriceId(): string | null {
  return process.env.STRIPE_PREMIUM_PRICE_ID?.trim() || null;
}
