'use client';

/**
 * AdProvider — SINGLE programmatic ad network selector.
 *
 * Reads NEXT_PUBLIC_AD_PROVIDER (adsense|ezoic|raptive|none; default adsense).
 * Loads EXACTLY ONE provider:
 *   - adsense  → reuses the existing AdSense <ins> slot (ad-slot.tsx). No second
 *                loader is injected; the loader already lives in layout.tsx <head>.
 *   - ezoic    → injects a <Script strategy="afterInteractive"> via
 *                NEXT_PUBLIC_EZOIC_SITE_ID. Renders null when that var is unset.
 *   - raptive  → injects a <Script> via NEXT_PUBLIC_RAPTIVE_SITE_ID. Renders
 *                null when that var is unset.
 *   - none     → renders nothing.
 *
 * This component NEVER loads two programmatic providers simultaneously.
 *
 * CWV: the wrapper reserves min-height (via slotClassName) so layout doesn't
 * shift when the provider fills. Below-fold activation is handled by AdSlot
 * (for adsense) or by the provider's own lazy-load (ezoic/raptive).
 */

import Script from 'next/script';
import { AdSlot } from '@/components/common/ad-slot';
import { resolveAdProvider } from '@/lib/monetization';

interface AdProviderProps {
  /** AdSense slot id — used only when provider === 'adsense'. */
  slot?: string;
  /** Extra className forwarded to the AdSense wrapper. */
  className?: string;
}

// Resolve provider at module scope (server-evaluated env var — stable).
const PROVIDER = resolveAdProvider(process.env.NEXT_PUBLIC_AD_PROVIDER);
const EZOIC_SITE_ID = process.env.NEXT_PUBLIC_EZOIC_SITE_ID?.trim() || null;
const RAPTIVE_SITE_ID = process.env.NEXT_PUBLIC_RAPTIVE_SITE_ID?.trim() || null;

export function AdProvider({ slot, className }: AdProviderProps) {
  // ── AdSense ──────────────────────────────────────────────────────────────
  // Reuse existing AdSlot. Loader already injected in layout.tsx <head>.
  if (PROVIDER === 'adsense') {
    // Only render the slot when a slot id is configured (mirrors the existing
    // guard in the result/home pages).
    if (!slot) return null;
    return <AdSlot slot={slot} className={className} />;
  }

  // ── Ezoic ────────────────────────────────────────────────────────────────
  // Inject the Ezoic loader script once (afterInteractive). Render nothing
  // when the site id env var is unset — never a broken/empty unit.
  if (PROVIDER === 'ezoic') {
    if (!EZOIC_SITE_ID) return null;
    return (
      <Script
        id="ezoic-loader"
        strategy="afterInteractive"
        src={`https://the.gatekeeperconsent.com/cmp.min.js`}
        data-cfasync="false"
        // data-ezoic-id is set via the script src / Ezoic's own embed; the
        // owner must supply NEXT_PUBLIC_EZOIC_SITE_ID for their account.
        data-ezoic-id={EZOIC_SITE_ID}
      />
    );
  }

  // ── Raptive ──────────────────────────────────────────────────────────────
  if (PROVIDER === 'raptive') {
    if (!RAPTIVE_SITE_ID) return null;
    return (
      <Script
        id="raptive-loader"
        strategy="afterInteractive"
        src={`https://cdn.raptive.com/raptive.js`}
        data-site={RAPTIVE_SITE_ID}
      />
    );
  }

  // ── none / unknown ────────────────────────────────────────────────────────
  return null;
}
