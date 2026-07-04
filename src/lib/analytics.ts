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
  | 'email_signup'
  | 'ai_referral'
  | 'embed_referral'
  | 'community_referral';

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

// ─── 부속P CODE-07 — AI-referral & rich-context detection ──────────────────
//
// Pure measurement: classifies the FIRST load of a session by
// `document.referrer` host so the otherwise-invisible GEO/AI-citation
// traffic (부속P §2 lever [1]) and the embed/community/directory referral
// channels (levers [2]/[4]) become visible in the existing GA4 property,
// without any UI change and without touching consent state. Firing goes
// through the same consent-gated trackEvent() pipeline as every other
// event, so it silently no-ops until the user has granted analytics.

/** Known AI-answer-engine referrer hostnames (부속P CODE-07 사양). Matched by
 *  exact host or subdomain suffix (e.g. `www.perplexity.ai` still matches
 *  `perplexity.ai`). Keys are the canonical `source` value sent to GA4. */
const AI_ENGINE_HOSTS: ReadonlyArray<{ source: string; hosts: readonly string[] }> = [
  { source: 'chatgpt', hosts: ['chatgpt.com', 'chat.openai.com'] },
  { source: 'perplexity', hosts: ['perplexity.ai'] },
  { source: 'gemini', hosts: ['gemini.google.com'] },
  { source: 'copilot', hosts: ['copilot.microsoft.com'] },
];

/** Known community/directory referrer hostnames (부속P CODE-07 사양 —
 *  "community/directory referrers" tagging, separate from the AI-engine
 *  ladder). Not exhaustive; covers the channels 부속P §5 OWN-01/02/03/04
 *  actually drive traffic through. */
const COMMUNITY_DIRECTORY_HOSTS: ReadonlyArray<{ source: string; hosts: readonly string[] }> = [
  { source: 'reddit', hosts: ['reddit.com'] },
  { source: 'quora', hosts: ['quora.com'] },
  { source: 'producthunt', hosts: ['producthunt.com'] },
  { source: 'pinterest', hosts: ['pinterest.com', 'pinterest.co.kr'] },
  { source: 'hackernews', hosts: ['news.ycombinator.com'] },
];

/** True when `host` equals `candidate` or is a subdomain of it
 *  (e.g. host=`www.perplexity.ai`, candidate=`perplexity.ai` → true). */
function hostMatches(host: string, candidate: string): boolean {
  return host === candidate || host.endsWith(`.${candidate}`);
}

/** utm_source values that indicate an AI engine's "share/cite" link or a
 *  detectable AI-Overview click-through, for engines that route clicks
 *  through a redirector rather than sending a plain referrer host. */
const AI_UTM_SOURCES = new Set([
  'chatgpt.com',
  'chatgpt',
  'perplexity',
  'perplexity.ai',
  'gemini',
  'bing.com/search/ai',
  'copilot',
  'ai-overview',
  'aio',
]);

export type ReferralClassification =
  | { kind: 'ai_referral'; source: string }
  | { kind: 'embed_referral'; source: string }
  | { kind: 'community_referral'; source: string }
  | { kind: 'none' };

/**
 * Pure classifier: given a referrer URL string (from `document.referrer`)
 * and the current page's query string (from `window.location.search`),
 * decides whether this load should be tagged as an AI-engine referral,
 * an embed-attribution referral (CODE-03's `utm_source=embed` + `utm_campaign`
 * host param), a known community/directory referral, or none of the above.
 *
 * Pure function (no `window` access) so it is trivially unit-testable and
 * reusable from both the browser classifier below and tests.
 */
export function classifyReferral(referrer: string, search: string): ReferralClassification {
  const params = new URLSearchParams(search);

  // CODE-03 embed referral: our own /embed attribution link tags
  // utm_source=embed&utm_campaign={host}. This takes priority over generic
  // AI/community matching since it is our own first-party attribution.
  if (params.get('utm_source') === 'embed') {
    const campaign = params.get('utm_campaign');
    return { kind: 'embed_referral', source: campaign && campaign !== 'unknown' ? campaign : 'unknown' };
  }

  // utm-based AI-Overview / AI-engine click-through detection (some AI
  // surfaces route through a redirector and don't preserve a plain
  // document.referrer host).
  const utmSource = (params.get('utm_source') || '').toLowerCase();
  if (AI_UTM_SOURCES.has(utmSource)) {
    const known = AI_ENGINE_HOSTS.find((e) => utmSource.includes(e.source));
    return { kind: 'ai_referral', source: known ? known.source : 'ai-overview' };
  }

  if (!referrer) return { kind: 'none' };

  let host: string;
  try {
    host = new URL(referrer).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return { kind: 'none' };
  }

  for (const engine of AI_ENGINE_HOSTS) {
    if (engine.hosts.some((h) => hostMatches(host, h))) {
      return { kind: 'ai_referral', source: engine.source };
    }
  }

  for (const community of COMMUNITY_DIRECTORY_HOSTS) {
    if (community.hosts.some((h) => hostMatches(host, h))) {
      return { kind: 'community_referral', source: community.source };
    }
  }

  return { kind: 'none' };
}

const REFERRAL_CLASSIFIED_KEY = 'cc_referral_classified';

/**
 * Runs the referrer classifier once per browser session (guarded by a
 * sessionStorage flag so client-side navigations within the SPA don't
 * re-fire it against a stale `document.referrer`) and fires the matching
 * GA4 event through the existing consent-gated trackEvent() pipeline. Each
 * channel gets its OWN tagged event (부속P CODE-07 사양: "Separately tag
 * embed-referral sessions ... and community/directory referrers") so the
 * three measurement ladders in 부속P §7 stay distinguishable in GA4:
 *
 *   - AI engine referrer/UTM        -> ai_referral        { source }
 *   - CODE-03 embed attribution hit -> embed_referral     { source }
 *     (a visit to the canonical destination page that arrived via the
 *     /embed widget's "Powered by FIREPath" link, i.e.
 *     utm_source=embed&utm_campaign={host} — distinct from `embed_loaded`,
 *     which fires INSIDE the iframe itself on widget mount)
 *   - known community/directory ref -> community_referral { source }
 *
 * Call once on mount from the root client provider (see providers.tsx),
 * mirroring initTrafficMarker()'s call pattern. Pure measurement — never
 * alters UI, never blocks rendering, no-ops entirely on the server.
 */
export function initReferralClassifier(): void {
  if (typeof window === 'undefined') return;

  try {
    if (window.sessionStorage.getItem(REFERRAL_CLASSIFIED_KEY) === '1') return;
  } catch {
    // sessionStorage unavailable — fall through and classify anyway; worst
    // case is a duplicate event on this one load, not a crash.
  }

  const classification = classifyReferral(document.referrer || '', window.location.search || '');

  switch (classification.kind) {
    case 'ai_referral':
      trackEvent('ai_referral', { source: classification.source });
      break;
    case 'embed_referral':
      trackEvent('embed_referral', { source: classification.source });
      break;
    case 'community_referral':
      trackEvent('community_referral', { source: classification.source });
      break;
    case 'none':
      break;
  }

  try {
    window.sessionStorage.setItem(REFERRAL_CLASSIFIED_KEY, '1');
  } catch {
    // Nothing to persist — acceptable to re-classify on the next load.
  }
}
