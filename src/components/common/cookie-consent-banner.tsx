'use client';

/**
 * Cookie Consent Banner — GEO-DIFFERENTIATED Consent Mode v2 model.
 *
 * The AdSense loader and gtag.js are loaded UNCONDITIONALLY in <head> (env-
 * guarded), with Consent Mode v2 defaulting all storage to DENIED *before* any
 * Google script runs (see app/layout.tsx). This component then issues the
 * per-region consent UPDATE so personalized ads / analytics can serve on the
 * first visit where the law allows it:
 *
 *   - EEA / UK / Switzerland: consent stays DENIED. The banner shows; on Accept
 *     we call gtag('consent','update', {all granted}). Google's certified CMP
 *     (enabled later in the AdSense dashboard) additionally governs these users.
 *   - Everyone else (US default, incl. unknown country): we call
 *     gtag('consent','update', {all granted}) immediately on load — US notice +
 *     opt-out / CCPA posture — so ads + analytics serve on the FIRST visit. The
 *     banner still shows as a notice but does NOT block anything.
 *
 * The user's stored choice ('accepted' | 'declined') lives in localStorage under
 * "firepath_cookie_consent". Analytics (GA) follows the same consent via Consent
 * Mode; we still fire gtag('config') so GA initializes once consent is granted.
 *
 * Withdrawal: clearing the stored choice (Footer "Do Not Sell / Manage Consent")
 * re-shows the banner. See firepath_consent events below.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Cookie } from 'lucide-react';

const CONSENT_KEY = 'firepath_cookie_consent';
const COUNTRY_COOKIE = 'visitor_country';
/** Event the footer "Manage Consent" link dispatches to re-open the banner. */
export const REOPEN_CONSENT_EVENT = 'firepath:reopen-consent';

type ConsentValue = 'accepted' | 'declined';

// Whether ad cookies are in play depends on AdSense being configured. Keeps the
// consent copy honest: no ad client id → "we do not use advertising cookies".
const ADS_ENABLED = Boolean(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);

// EEA + UK + Switzerland + Iceland/Liechtenstein/Norway. These require prior
// consent (GDPR) → keep DENIED until the user accepts. Everyone else gets the
// US notice-and-opt-out posture (granted on load).
const EEA_UK_CH = new Set([
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR',
  'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK',
  'SI', 'ES', 'SE', 'IS', 'LI', 'NO', 'GB', 'CH',
]);

const GRANTED = {
  ad_storage: 'granted',
  ad_user_data: 'granted',
  ad_personalization: 'granted',
  analytics_storage: 'granted',
} as const;

/** Read a cookie value on the client. */
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([.$?*|{}()[\]\\/+^])/g, '\\$1') + '=([^;]*)')
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/** True when the visitor is in a region requiring prior (opt-in) consent. */
function isConsentRequiredRegion(): boolean {
  const country = (readCookie(COUNTRY_COOKIE) || '').toUpperCase();
  // Unknown country → treat as US/non-EEA (granted-on-load), per the approved
  // model. Only the explicit EEA/UK/CH set is opt-in.
  return EEA_UK_CH.has(country);
}

/** Push a Consent Mode v2 update. Safe no-op if gtag isn't present. */
function updateConsent(state: typeof GRANTED): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', state);
}

/**
 * Initialize the GA4 config call once consent allows analytics. The gtag.js
 * loader is injected in <head>; here we only fire the config (idempotent guard).
 * No-op when GA env is unset.
 */
function initGA(): void {
  const measurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID;
  if (!measurementId) return;
  if (typeof window === 'undefined') return;

  // Ensure gtag exists even if the head loader hasn't defined it yet (it does,
  // via the Consent Mode default snippet, but stay defensive).
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag !== 'function') {
    function gtag(...args: unknown[]): void {
      window.dataLayer.push(args);
    }
    window.gtag = gtag;
  }

  // If the gtag.js loader script isn't present yet, inject it (env-guarded).
  if (!document.getElementById('ga-script')) {
    const script = document.createElement('script');
    script.id = 'ga-script';
    script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    script.async = true;
    document.head.appendChild(script);
  }

  // Guard the config call so it fires only once.
  const w = window as unknown as { __firepathGaConfigured?: boolean };
  if (w.__firepathGaConfigured) return;
  w.__firepathGaConfigured = true;
  window.gtag('js', new Date());
  // PRIVACY: GA4's default page_location is document.location.href, which on
  // this app's calculator/result pages includes a URL HASH encoding the
  // user's FIRE scenario (income, net worth, savings rate, expenses — see
  // src/lib/engine/url-state.ts KEY_MAP). The hash is never sent to any
  // server by the browser on its own, but GA4 reads it via JS and WOULD embed
  // it in page_location/page_referrer unless explicitly stripped. We pass a
  // hash-stripped page_location so no calculator input values are ever sent
  // to Google Analytics.
  window.gtag('config', measurementId, {
    anonymize_ip: true,
    page_location: window.location.href.split('#')[0],
  });
}

/** Grant analytics + ads consent and init GA. */
function grantAll(): void {
  updateConsent(GRANTED);
  initGA();
}

function readStoredConsent(): ConsentValue | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CONSENT_KEY) as ConsentValue | null;
}

type Decision = 'show' | 'hidden';

export function CookieConsentBanner() {
  // null until the client resolves it (SSR + first client render → null → render
  // null, so hydration matches). Resolved in a microtask off the render path.
  const [decision, setDecision] = useState<Decision | null>(null);

  useEffect(() => {
    let cancelled = false;
    const resolve = () => {
      if (cancelled) return;
      const stored = readStoredConsent();
      const optIn = isConsentRequiredRegion();

      if (stored === 'accepted') {
        // Prior explicit acceptance (any region) — grant now, no banner.
        grantAll();
        setDecision('hidden');
        return;
      }
      if (stored === 'declined') {
        // Prior explicit decline — keep DENIED (default), no banner.
        setDecision('hidden');
        return;
      }

      // No stored choice yet.
      if (optIn) {
        // EEA/UK/CH: stay DENIED, show the banner to collect opt-in.
        setDecision('show');
      } else {
        // US default / unknown: grant immediately (notice + opt-out), still
        // show the banner as a non-blocking notice.
        grantAll();
        setDecision('show');
      }
    };

    queueMicrotask(resolve);

    // Re-open handler (footer "Manage Consent" / Do Not Sell link).
    const onReopen = () => {
      if (cancelled) return;
      setDecision('show');
    };
    window.addEventListener(REOPEN_CONSENT_EVENT, onReopen);

    return () => {
      cancelled = true;
      window.removeEventListener(REOPEN_CONSENT_EVENT, onReopen);
    };
  }, []);

  const visible = decision === 'show';
  const setVisible = (next: boolean) => setDecision(next ? 'show' : 'hidden');

  const handleAccept = () => {
    localStorage.setItem(CONSENT_KEY, 'accepted');
    setVisible(false);
    grantAll();
  };

  const handleDecline = () => {
    localStorage.setItem(CONSENT_KEY, 'declined');
    setVisible(false);
    // Consent stays at the DENIED default; nothing further to update.
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/90 shadow-md"
    >
      <div className="mx-auto max-w-7xl px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie className="h-5 w-5 text-[var(--fire-coast)] shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            We use <strong className="text-foreground">strictly necessary cookies</strong> for
            authentication and, with your consent, <strong className="text-foreground">analytics
            cookies</strong> (Google Analytics 4){' '}
            {ADS_ENABLED ? (
              <>
                and <strong className="text-foreground">advertising cookies</strong> (Google
                AdSense) to keep FIREPath free. Premium subscribers see no ads.
              </>
            ) : (
              <>to improve FIREPath. We do not use advertising cookies.</>
            )}{' '}
            <Link
              href="/privacy#4-cookies-and-tracking-technologies"
              className="underline hover:text-foreground transition-colors duration-200"
            >
              Learn more
            </Link>
            .
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDecline}
            aria-label="Decline non-essential cookies"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={handleAccept}
            aria-label="Accept all cookies including analytics"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
