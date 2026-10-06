'use client';

/**
 * Cookie notice, opened only from the footer "Manage consent" link outside
 * EEA/UK/CH. The consent defaults come from the server-rendered head script
 * (src/lib/consent.ts); this component sends updates only for an explicit
 * Accept/Decline and re-applies a stored decline on every mount. EEA/UK/CH
 * visitors get Google's certified CMP instead: no banner, no update here.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { isCanonicalProductionHost } from '@/lib/site';
import { adsEnabled } from '@/lib/ads-env';
import {
  CONSENT_KEY,
  REOPEN_CONSENT_EVENT,
  readVisitorCountry,
  runConsentEvent,
  type ConsentChoice,
  type ConsentIO,
  type ConsentState,
} from '@/lib/consent';
import { Cookie } from 'lucide-react';

// Keeps the consent copy honest: no ad client id → "we do not use advertising cookies".
const ADS_ENABLED = adsEnabled();

/** Push a Consent Mode v2 update. Safe no-op if gtag isn't present. */
function updateConsent(state: ConsentState): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  window.gtag('consent', 'update', state);
}

/** NEXT_PUBLIC_GA_DEBUG=1 is set only on Vercel Preview deploys — lets GA
 *  load there in a debug_mode + internal-traffic posture so preview visits
 *  land in DebugView and the internal filter, never in production reports. */
function isGaDebugPreview(): boolean {
  return process.env.NEXT_PUBLIC_GA_DEBUG === '1';
}

/**
 * Initialize the GA4 config call once consent allows analytics. The gtag.js
 * loader is injected in <head>; here we only fire the config (idempotent guard).
 * No-op when GA env is unset.
 *
 * 부속I T01 — gate: only injects gtag.js when running on the canonical
 * production hostname, OR (on non-production) when NEXT_PUBLIC_GA_DEBUG=1,
 * in which case it also tags debug_mode + traffic_type:'internal' so the
 * traffic is visible only in DebugView / the internal filter. This wraps
 * ONLY the script-injection step below — Consent Mode v2 defaults/updates
 * are untouched.
 */
function initGA(): void {
  const measurementId =
    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || process.env.NEXT_PUBLIC_GA_ID;
  if (!measurementId) return;
  if (typeof window === 'undefined') return;

  const canonical = isCanonicalProductionHost(
    window.location.hostname,
    process.env.NEXT_PUBLIC_VERCEL_ENV,
  );
  const debugPreview = isGaDebugPreview();
  if (!canonical && !debugPreview) return;

  // Ensure gtag exists even if the head loader hasn't defined it yet (it does,
  // via the Consent Mode default snippet, but stay defensive).
  window.dataLayer = window.dataLayer ?? [];
  if (typeof window.gtag !== 'function') {
    // TS control-flow narrowing on `window.dataLayer` above doesn't extend
    // into this nested closure (a separate scope, invoked later), so capture
    // the already-guaranteed-defined array by reference here instead of
    // re-reading window.dataLayer inside the closure body.
    const dataLayer = window.dataLayer;
    function gtag(...args: unknown[]): void {
      dataLayer.push(args);
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

  if (!canonical && debugPreview) {
    // Non-production Preview with the debug flag on: mark every hit
    // debug_mode + internal so it only ever lands in DebugView / the
    // internal-traffic filter, never in production reports.
    window.gtag('set', { traffic_type: 'internal' });
  }

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
    ...(!canonical && debugPreview ? { debug_mode: true } : {}),
  });
}

function readStoredConsent(): ConsentChoice | null {
  try {
    const value = localStorage.getItem(CONSENT_KEY);
    return value === 'accepted' || value === 'declined' ? value : null;
  } catch {
    return null;
  }
}

function writeStoredConsent(value: ConsentChoice): void {
  try {
    localStorage.setItem(CONSENT_KEY, value);
  } catch {
    // storage unavailable (private mode): the choice still applies to this visit
  }
}

function makeConsentIO(setVisible: (visible: boolean) => void): ConsentIO {
  return {
    country: readVisitorCountry,
    readStored: readStoredConsent,
    writeStored: writeStoredConsent,
    update: updateConsent,
    initAnalytics: initGA,
    setVisible,
  };
}

export function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const io = makeConsentIO(setVisible);
    runConsentEvent('mount', io);
    const onReopen = () => runConsentEvent('reopen', io);
    window.addEventListener(REOPEN_CONSENT_EVENT, onReopen);
    return () => window.removeEventListener(REOPEN_CONSENT_EVENT, onReopen);
  }, []);

  const io = makeConsentIO(setVisible);

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
                AdSense) to keep FIREPath free.
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
            onClick={() => runConsentEvent('decline', io)}
            aria-label="Decline non-essential cookies"
          >
            Decline
          </Button>
          <Button
            size="sm"
            onClick={() => runConsentEvent('accept', io)}
            aria-label="Accept all cookies including analytics"
          >
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
