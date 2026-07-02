/**
 * analytics.ts — shared GA4 event tracking module (부속I T02).
 *
 * Single source of truth for every custom GA4 event fired by this app. All
 * events flow through the EXISTING consent-gated gtag pipeline (Consent Mode
 * v2 defaults in src/app/layout.tsx + the accept/decline flow in
 * cookie-consent-banner.tsx) — this module never touches consent state and
 * never injects gtag.js itself.
 *
 * Design:
 *   - EventName is a string-literal union so a misnamed event fails `tsc`
 *     instead of silently vanishing (gtag has no runtime validation).
 *   - trackEvent() is a no-op on the server and when `window.gtag` isn't a
 *     function yet (pre-consent / pre-load) — callers never need to guard.
 *   - Every event is tagged with `site` so the shared GA4 property
 *     (Cost Calculators, one property across 5 sibling sites) can be split
 *     per-site in Explorations via the `site` dimension.
 *   - `traffic_type: 'internal'` is added automatically once the owner (or a
 *     crew member) visits with `?crew=1` — see initTrafficMarker() — so
 *     internal/self visits can be excluded via a GA4 data filter without
 *     touching code again.
 */

/** Per-repo site identifier — used as the `site` param on every event so the
 *  shared GA4 property can be split per-site. Falls back to a literal when
 *  the env var isn't set (e.g. local dev without .env). */
export const SITE_ID = process.env.NEXT_PUBLIC_SITE_ID || 'firepath';

/** legalcostcalc and DentalCostFinder never send input values, result
 *  buckets, or other user-supplied state as event params. FIREPath is not a
 *  sensitive site. */
export const IS_SENSITIVE_SITE = false;

/**
 * Full custom-event catalog. A string-literal union so misspelled event
 * names fail `tsc` instead of silently never registering in GA4.
 */
export type EventName =
  | 'calc_input_start'
  | 'calculator_complete'
  | 'related_click'
  | 'outbound_click'
  | 'result_share'
  | 'embed_loaded'
  | 'state_restored'
  | 'web_vitals'
  | 'email_signup';

type EventParamValue = string | number;
type EventParams = Record<string, EventParamValue>;
/** Internal merged-param shape — adds the boolean `debug_mode` flag that GA4
 *  accepts but that callers of trackEvent() should never pass directly. */
type InternalEventParams = Record<string, EventParamValue | boolean>;

const TRAFFIC_TYPE_KEY = 'cc_traffic_type';
const MAX_PARAMS = 25;

// window.dataLayer / window.gtag are declared globally in
// src/types/global.d.ts (shared augmentation — do not redeclare here, a
// second `declare global` with differing modifiers is a TS conflict). Both
// are typed as always-present there, but at runtime `gtag` is only defined
// once the consent-gated loader has run, so trackEvent() below still guards
// with a runtime `typeof window.gtag !== 'function'` check.

/** True when NEXT_PUBLIC_GA_DEBUG=1 (set only on Vercel Preview deploys). */
function isGaDebug(): boolean {
  return process.env.NEXT_PUBLIC_GA_DEBUG === '1';
}

/** Reads the internal-traffic marker set by initTrafficMarker() below. */
function isInternalTraffic(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(TRAFFIC_TYPE_KEY) === 'internal';
  } catch {
    // localStorage unavailable (private mode / quota) — treat as external.
    return false;
  }
}

/**
 * Fire a GA4 custom event through the existing gtag pipeline.
 *
 * No-op:
 *   - on the server (typeof window === 'undefined')
 *   - when `window.gtag` isn't a function yet (pre-consent: events fired
 *     before the consent-gated loader injects gtag.js are simply dropped
 *     rather than queued, since dataLayer already exists from the Consent
 *     Mode default snippet but gtag() may not be defined as a function on
 *     early paints in edge cases — staying a strict no-op here keeps the
 *     contract simple and matches the T02 acceptance criteria)
 *
 * Every call is merged with `{ site: SITE_ID }`, plus `traffic_type:
 * 'internal'` when the crew marker is set, plus `debug_mode: true` when
 * NEXT_PUBLIC_GA_DEBUG=1 (Preview only).
 */
export function trackEvent(name: EventName, params?: EventParams): void {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag !== 'function') return;

  const merged: InternalEventParams = {
    site: SITE_ID,
    ...params,
  };

  if (isInternalTraffic()) {
    merged.traffic_type = 'internal';
  }
  if (isGaDebug()) {
    merged.debug_mode = true;
  }

  // Enforce the <=25 params GA4 limit — trim silently rather than throwing,
  // since a tracking call must never break the calling UI.
  const entries = Object.entries(merged).slice(0, MAX_PARAMS);
  const finalParams = Object.fromEntries(entries);

  window.gtag('event', name, finalParams);
}

/**
 * Reads `?crew=1` / `?crew=0` from the current URL once (call on mount from
 * the root client provider) and persists an internal-traffic marker in
 * localStorage. When set, every subsequent trackEvent() call carries
 * `traffic_type: 'internal'` and also pushes a `gtag('set', ...)` so
 * page_view / enhanced-measurement events (which don't go through
 * trackEvent) are marked too.
 */
export function initTrafficMarker(): void {
  if (typeof window === 'undefined') return;

  const params = new URLSearchParams(window.location.search);
  const crew = params.get('crew');
  if (crew !== '1' && crew !== '0') return;

  try {
    if (crew === '1') {
      window.localStorage.setItem(TRAFFIC_TYPE_KEY, 'internal');
    } else {
      window.localStorage.removeItem(TRAFFIC_TYPE_KEY);
    }
  } catch {
    // localStorage unavailable — nothing to persist, but still mark the
    // current gtag session below when granting.
  }

  if (crew === '1' && typeof window.gtag === 'function') {
    window.gtag('set', { traffic_type: 'internal' });
  }
}
