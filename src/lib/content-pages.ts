/**
 * content-pages.ts — quality-gated internal content registry (부속I T09).
 *
 * FIREPath has no city/procedure-style programmatic dataset (unlike the
 * sibling DentalCostFinder/SaaSCostX repos' data/ directories) — its
 * "programmatic surface" is the static content pages (FIRE-type deep links,
 * guide articles, the healthcare-bridge tool, methodology/about) plus the
 * Supabase-backed /guide/[slug] catalog. This file is the single source of
 * truth every internal-link module (T06 result-related links, T07
 * breadcrumbs/hub links) and the sitemap/robots gate (T09) draw from, so
 * none of them can ever disagree about which pages are indexable/linkable.
 *
 * hasUniqueData is derived, not hand-waved:
 *   - FIRE-type anchors: true — each carries a real per-type computed target
 *     (engine output at default inputs), not template-substituted filler.
 *   - healthcare-bridge: true — a distinct interactive tool with its own
 *     formula and sources, not a variable-substituted clone of another page.
 *   - methodology: true — unique, sourced (19 citations) content.
 *   - guide/*: true for the 7 shipped FIRE-education articles (each has a
 *     distinct FIRE-type focus and hand-written content). Any FUTURE guide
 *     slug added to this list without real content must be flagged false
 *     here before it ships — see the guide-content-length check in
 *     src/app/(main)/guide/[slug]/page.tsx generateMetadata, which is a
 *     runtime backstop for DB-authored guides that bypass this static list.
 *
 * Do NOT delete a page by removing it here — flip hasUniqueData to false
 * instead (그 페이지는 유지, 링크/색인에서만 제외). See 부속I T09 anti-pattern:
 * never bulk-flip flags back without adding data, never generate new thin
 * spokes to fill a hub.
 */

export type LinkModule = 'result_related' | 'inline' | 'breadcrumb' | 'hub' | 'compare_chain' | 'footer_crosslink';

export interface ContentPage {
  /** Absolute site path, e.g. '/fire-types#lean'. */
  path: string;
  /** Canonical path used for sitemap/robots (anchors collapse to their parent page). */
  canonicalPath: string;
  /** Short label for link text. */
  title: string;
  /** One-line description for link modules. */
  description: string;
  /** FIRE type this page/section is most related to, for sibling-link matching. */
  fireType: 'lean' | 'regular' | 'fat' | 'coast' | 'barista' | null;
  /**
   * True only when the page carries real, non-template-substituted content
   * (a computed data point, sourced citations, or hand-written analysis).
   * false pages are excluded from sitemap.ts, robots-noindexed via
   * generateMetadata, and never linked from T06/T07/T08 modules.
   */
  hasUniqueData: boolean;
  /** 'core' = always-indexed navigational page; 'spoke' = content page gated by hasUniqueData. */
  kind: 'core' | 'hub' | 'spoke';
}

/**
 * FIRE-type sections on /fire-types — each has a real engine-computed
 * target/monthly/reachAge at default inputs (see FireTypeCard in
 * src/app/(main)/fire-types/page.tsx), so all five are unique data.
 */
export const FIRE_TYPE_PAGES: ContentPage[] = [
  {
    path: '/fire-types#lean',
    canonicalPath: '/fire-types',
    title: 'Lean FIRE',
    description: 'Minimalist retirement on 60% of expenses.',
    fireType: 'lean',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/fire-types#regular',
    canonicalPath: '/fire-types',
    title: 'Regular FIRE',
    description: 'Standard retirement covering 100% of expenses.',
    fireType: 'regular',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/fire-types#fat',
    canonicalPath: '/fire-types',
    title: 'Fat FIRE',
    description: 'Comfortable retirement on 150% of expenses.',
    fireType: 'fat',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/fire-types#coast',
    canonicalPath: '/fire-types',
    title: 'Coast FIRE',
    description: 'Grow to your goal without further contributions.',
    fireType: 'coast',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/fire-types#barista',
    canonicalPath: '/fire-types',
    title: 'Barista FIRE',
    description: 'Part-time work covers 50% of expenses.',
    fireType: 'barista',
    hasUniqueData: true,
    kind: 'spoke',
  },
];

/**
 * Guide article slugs mirroring the hardcoded fallback list in
 * src/app/sitemap.ts (Supabase may be unavailable at build time — see that
 * file's comment). Each carries a distinct FIRE-type focus and hand-written
 * content, so all are hasUniqueData: true. This is the SAME list sitemap.ts
 * enumerates; T09's consistency test asserts they stay in sync.
 */
export const GUIDE_PAGES: ContentPage[] = [
  {
    path: '/guide/what-is-coastfire',
    canonicalPath: '/guide/what-is-coastfire',
    title: 'What is Coast FIRE?',
    description: 'How Coast FIRE lets your portfolio grow untouched to your goal.',
    fireType: 'coast',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/guide/what-is-leanfire',
    canonicalPath: '/guide/what-is-leanfire',
    title: 'What is Lean FIRE?',
    description: 'Minimalist FIRE on 60% of current expenses.',
    fireType: 'lean',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/guide/what-is-regular-fire',
    canonicalPath: '/guide/what-is-regular-fire',
    title: 'What is Regular FIRE?',
    description: 'The baseline "25x expenses" FIRE target.',
    fireType: 'regular',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/guide/what-is-fatfire',
    canonicalPath: '/guide/what-is-fatfire',
    title: 'What is Fat FIRE?',
    description: 'A more comfortable FIRE target at 150% of expenses.',
    fireType: 'fat',
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/guide/lean-vs-fat-fire',
    canonicalPath: '/guide/lean-vs-fat-fire',
    title: 'Lean FIRE vs. Fat FIRE',
    description: 'Comparing the two ends of the FIRE spending spectrum.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/guide/coast-vs-barista-fire',
    canonicalPath: '/guide/coast-vs-barista-fire',
    title: 'Coast FIRE vs. Barista FIRE',
    description: 'Two ways to ease off full-time work early.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/guide/what-is-baristafire',
    canonicalPath: '/guide/what-is-baristafire',
    title: 'What is Barista FIRE?',
    description: 'Part-time work covers the rest of your expenses.',
    fireType: 'barista',
    hasUniqueData: true,
    kind: 'spoke',
  },
];

/** Core/hub pages — always indexed, always linkable, not subject to the hasUniqueData gate. */
export const CORE_PAGES: ContentPage[] = [
  {
    path: '/',
    canonicalPath: '/',
    title: 'FIRE Calculator',
    description: 'Compare all 5 FIRE types on one interactive timeline.',
    fireType: null,
    hasUniqueData: true,
    kind: 'core',
  },
  {
    path: '/guide',
    canonicalPath: '/guide',
    title: 'FIRE Guides',
    description: 'All FIRE education articles in one hub.',
    fireType: null,
    hasUniqueData: true,
    kind: 'hub',
  },
  {
    path: '/fire-types',
    canonicalPath: '/fire-types',
    title: 'FIRE Types Explained',
    description: 'Formulas and worked examples for all 5 FIRE types.',
    fireType: null,
    hasUniqueData: true,
    kind: 'hub',
  },
  {
    path: '/healthcare-bridge',
    canonicalPath: '/healthcare-bridge',
    title: 'Healthcare Bridge Estimator',
    description: 'Estimate health insurance cost before Medicare eligibility.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
  },
  {
    path: '/methodology',
    canonicalPath: '/methodology',
    title: 'How We Calculate',
    description: 'The formulas and sources behind every FIREPath number.',
    fireType: null,
    hasUniqueData: true,
    kind: 'core',
  },
  {
    path: '/about',
    canonicalPath: '/about',
    title: 'About FIREPath',
    description: 'Who built FIREPath and where the data comes from.',
    fireType: null,
    hasUniqueData: true,
    kind: 'core',
  },
];

/** Every registered content page (core + hub + spokes). */
export const ALL_CONTENT_PAGES: ContentPage[] = [...CORE_PAGES, ...FIRE_TYPE_PAGES, ...GUIDE_PAGES];

/** Pages that pass the hasUniqueData gate — the only pages sitemap/link-modules may reference. */
export function getIndexablePages(): ContentPage[] {
  return ALL_CONTENT_PAGES.filter((p) => p.hasUniqueData);
}

/**
 * Returns 3-5 sibling content pages related to a FIRE type, for the T06
 * result-moment RelatedCalculators-style module. Only ever draws from
 * hasUniqueData pages. Prioritizes the matching FIRE-type spoke pages, then
 * fills remaining slots with hub pages.
 */
export function getRelatedContentPages(fireType: ContentPage['fireType'], max = 5): ContentPage[] {
  const indexable = getIndexablePages();
  const spokes = indexable.filter((p) => p.kind === 'spoke');

  const matching = fireType ? spokes.filter((p) => p.fireType === fireType) : [];
  const others = spokes.filter((p) => !matching.includes(p));

  const picked = [...matching, ...others].slice(0, max);
  if (picked.length >= 3) return picked;

  // Fall back to hub pages if fewer than 3 spokes exist (defensive; not hit today).
  const hubs = indexable.filter((p) => p.kind === 'hub' && !picked.includes(p));
  return [...picked, ...hubs].slice(0, max);
}
