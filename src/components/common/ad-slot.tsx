'use client';

/**
 * AdSlot — Google AdSense display unit (freemium model).
 *
 * Renders the AdSense <ins> unit only when NEXT_PUBLIC_ADSENSE_CLIENT_ID is set;
 * otherwise renders an inert, labelled placeholder (so the layout is honest and
 * the build/free site work with no ad env). The AdSense loader script is now
 * injected UNCONDITIONALLY in <head> (app/layout.tsx); ad personalization is
 * governed by Consent Mode v2, not by whether this script loads.
 *
 * Placement policy: free-tier surfaces only (guides, result page). Never on the
 * calculator INPUT screen. Premium users render NOTHING — callers gate this via
 * the server premium helper (`!isPremium`) and simply don't mount AdSlot.
 *
 * CWV:
 *   - The live <ins> wrapper reserves vertical space (min-h) matching the
 *     placeholder so the page doesn't shift (CLS) when the ad fills.
 *   - We init the adsbygoogle array BEFORE pushing, and only push once the
 *     loader script is present/loaded.
 *   - Below-the-fold slots are lazy-activated via IntersectionObserver
 *     (rootMargin ~400px). Above-the-fold slots pass `eager` to push on mount.
 */

import { useEffect, useRef, useState } from 'react';

// Normalise: accept values with or without the leading "ca-" prefix.
// data-ad-client must be in "ca-pub-..." form for AdSense to work.
const _rawClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID?.trim();
const ADSENSE_CLIENT = _rawClientId
  ? _rawClientId.startsWith('ca-')
    ? _rawClientId
    : `ca-${_rawClientId}`
  : undefined;
const SCRIPT_ID = 'adsense-loader';

// Reserve space matching the placeholder to prevent CLS when the ad fills.
const RESERVE = 'min-h-[100px] md:min-h-[280px]';

export function AdSlot({
  slot,
  className,
  format = 'auto',
  eager = false,
}: {
  slot?: string;
  className?: string;
  format?: string;
  /** Above-the-fold slots set this to push on mount instead of lazily. */
  eager?: boolean;
}) {
  const insRef = useRef<HTMLModElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const pushed = useRef(false);
  // Lazy gate: eager slots are "in view" immediately; others wait for the
  // IntersectionObserver to fire.
  const [inView, setInView] = useState(eager);

  // Below-the-fold activation: observe the wrapper and flip inView once it
  // approaches the viewport (rootMargin ~400px). Eager slots skip this.
  useEffect(() => {
    if (!ADSENSE_CLIENT || eager || inView) return;
    const el = wrapperRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      // No observer support → don't starve the slot; activate it (deferred off
      // the render path to satisfy react-hooks/set-state-in-effect).
      let cancelled = false;
      queueMicrotask(() => {
        if (!cancelled) setInView(true);
      });
      return () => {
        cancelled = true;
      };
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, inView]);

  // Push a fill request once: the slot is in view AND the loader is present.
  // The loader lives in <head> (not consent-gated), so it is typically present
  // on mount; we still verify and poll briefly to be robust to async load.
  useEffect(() => {
    if (!ADSENSE_CLIENT || !inView || pushed.current) return;

    const tryPush = (): boolean => {
      if (pushed.current) return true;
      if (typeof window === 'undefined') return false;
      // Loader script must be present before pushing.
      if (!document.getElementById(SCRIPT_ID)) return false;
      const w = window as unknown as { adsbygoogle?: unknown[] };
      // Init the array BEFORE pushing (fixes the ordering bug).
      w.adsbygoogle = w.adsbygoogle ?? [];
      try {
        w.adsbygoogle.push({});
        pushed.current = true;
        return true;
      } catch {
        // Blocked / not ready — leave the reserved space, never throw.
        return false;
      }
    };

    if (tryPush()) return;
    const interval = window.setInterval(() => {
      if (tryPush()) window.clearInterval(interval);
    }, 500);
    // Stop polling after ~15s; keep the reserved placeholder if it never loads.
    const timeout = window.setTimeout(() => window.clearInterval(interval), 15_000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [inView]);

  // No client id configured → inert labelled placeholder (no empty grey box).
  if (!ADSENSE_CLIENT) {
    return (
      <aside
        aria-label="Advertisement placeholder"
        className={`my-6 ${RESERVE} flex flex-col justify-center rounded-xl border border-dashed bg-muted/30 px-4 py-6 text-center ${className ?? ''}`}
      >
        <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
          Advertisement
        </span>
        <p className="mt-1 text-xs text-muted-foreground">
          Ads support the free version of FIREPath.
        </p>
      </aside>
    );
  }

  return (
    <aside
      ref={wrapperRef}
      aria-label="Advertisement"
      className={`my-6 ${RESERVE} overflow-hidden text-center ${className ?? ''}`}
    >
      <span className="mb-1 block text-[10px] uppercase tracking-wide text-muted-foreground">
        Advertisement
      </span>
      <ins
        ref={insRef}
        className="adsbygoogle block"
        style={{ display: 'block' }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </aside>
  );
}
