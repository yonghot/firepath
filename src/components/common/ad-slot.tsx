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
 *
 * SPA re-init (부속I T05): AdSense only auto-fills a unit on a full page
 * load. Next.js client-side <Link> navigations reuse this same AdSlot
 * component instance across routes (it typically lives in a persistent
 * layout/page shell) without ever remounting the <ins> element, so without
 * this fix, related-link / cross-link navigations could never produce a
 * second ad impression. Fix:
 *   (a) key={`${slot}-${pathname}`} passed to the <ins> element itself —
 *       forces React to unmount/remount JUST the <ins> DOM node per route
 *       (AdSense stamps data-ad-status on that exact node, so a fresh node
 *       is required for a fresh fill attempt) while the <aside> wrapper and
 *       component instance stay mounted.
 *   (b) on route change, only push a fill request when the (fresh) <ins>
 *       element's data-ad-status attribute is unset — never re-push an
 *       element AdSense already marked 'filled' or 'unfilled' (double-push
 *       throws and can double-count impressions).
 *   (c) exactly one retry, 750ms after the first attempt, if data-ad-status
 *       is still unset by then; no further polling, no timer-based refresh.
 */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isValidSlotId } from '@/lib/ad-slots';
import { resolveAdsenseClientId } from '@/lib/ads-env';

const ADSENSE_CLIENT = resolveAdsenseClientId();
const SCRIPT_ID = 'adsense-loader';

// Reserve space matching the placeholder to prevent CLS when the ad fills.
const RESERVE = 'min-h-[100px] md:min-h-[280px]';

/** Single-attempt fill: init the array, guard on data-ad-status, push once. */
function pushFill(el: HTMLModElement): boolean {
  if (typeof window === 'undefined') return false;
  // Never re-push an element AdSense already resolved (filled/unfilled) —
  // double-push throws and can double-count impressions.
  if (el.getAttribute('data-ad-status')) return true;
  if (!document.getElementById(SCRIPT_ID)) return false;
  const w = window as unknown as { adsbygoogle?: unknown[] };
  w.adsbygoogle = w.adsbygoogle ?? [];
  try {
    w.adsbygoogle.push({});
    return true;
  } catch {
    // Blocked / not ready — leave the reserved space, never throw.
    return false;
  }
}

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
  const pathname = usePathname();
  const insRef = useRef<HTMLModElement>(null);
  const wrapperRef = useRef<HTMLElement>(null);
  const pushedForPath = useRef<string | null>(null);
  // Lazy gate: eager slots are "in view" immediately; others wait for the
  // IntersectionObserver to fire. Re-armed on every route change below (부속I
  // T05) since this component instance persists across client-side
  // navigations while the <ins> DOM node it targets is remounted per-route
  // via `key` further down.
  const [inView, setInView] = useState(eager);

  // Route change: re-arm the lazy gate for the new route. Deferred via
  // queueMicrotask (same pattern as CookieConsentBanner/TermsGate elsewhere
  // in this repo) to avoid the react-hooks/set-state-in-effect cascading-
  // render lint warning from a synchronous setState in an effect body.
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setInView(eager);
    });
    return () => {
      cancelled = true;
    };
  }, [pathname, eager]);

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
  }, [eager, inView, pathname]);

  // Push a fill request once per route: the slot is in view AND the loader
  // is present AND this route hasn't already been pushed. Exactly one retry
  // 750ms later if the first attempt didn't resolve data-ad-status yet — no
  // further polling, no timer-based refresh (AdSense policy).
  useEffect(() => {
    if (!ADSENSE_CLIENT || !inView) return;
    if (pushedForPath.current === pathname) return;
    const el = insRef.current;
    if (!el) return;

    const attempt = () => {
      const ok = pushFill(el);
      if (ok) pushedForPath.current = pathname;
      return ok;
    };

    if (attempt()) return;

    const retry = window.setTimeout(() => {
      attempt();
    }, 750);
    return () => window.clearTimeout(retry);
  }, [inView, pathname]);

  // CODE-01 (부속W): a manual unit needs a REAL numeric slot id. Without one,
  // emitting <ins data-ad-slot={undefined}> produces an invalid unit that can
  // never fill. Auto ads (driven solely by the loader script in the layout)
  // are unaffected by this branch.
  if (!ADSENSE_CLIENT || !isValidSlotId(slot)) {
    // Render NOTHING. 부속W flagged empty ad-shaped boxes as a low-quality
    // signal in their own right: an AdSense/crawler review that meets a dashed
    // grey "Advertisement" frame with no ad in it reads the page as having more
    // ad furniture than publisher content. Omitting the region entirely is both
    // honest and review-safe (CODE-01 acceptance: 0 <ins> AND 0 empty boxes
    // when the slot is unconfigured).
    return null;
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
        key={`${slot ?? 'auto'}-${pathname}`}
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
