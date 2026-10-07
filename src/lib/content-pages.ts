/**
 * content-pages.ts — quality-gated internal content registry (부속I T09,
 * strengthened by 부속P CODE-06 into an explicit information-gain guard).
 *
 * FIREPath has no city/procedure-style programmatic dataset (unlike the
 * sibling DentalCostFinder/SaaSCostX repos' data/ directories) — its
 * "programmatic surface" is the static content pages (FIRE-type deep links,
 * guide articles, the healthcare-bridge tool, methodology/about) plus the
 * Supabase-backed /guide/[slug] catalog. This file is the single source of
 * truth every internal-link module (T06 result-related links, T07
 * breadcrumbs/hub links) and the sitemap/robots gate (T09/CODE-06) draw
 * from, so none of them can ever disagree about which pages are
 * indexable/linkable.
 *
 * 부속P CODE-06 information-gain guard: every 'spoke' page must list
 * `differentiatingFacts` — >=4 entity-specific facts that DIFFER from
 * sibling pages (a local/type-specific average, a range, a sample-scenario
 * result, a computed comparison-vs-benchmark, etc.) before it is
 * indexable. `hasUniqueData` for spoke pages is DERIVED from
 * `passesInformationGainGate(page)`, not hand-set — see that function.
 * 'core'/'hub' pages are exempt from the fact-count (부속I T09 always-index
 * navigational pages) but must still declare `hasUniqueData: true`
 * explicitly, since they carry real, non-templated content by construction.
 *
 * Historical fact basis (already true of every shipped page, now made
 * explicit as data rather than a prose claim):
 *   - FIRE-type anchors: each carries >=4 real per-type computed facts
 *     (target amount, monthly income, reach age, multiplier — see
 *     defaultResults in fire-types/page.tsx), not template-substituted filler.
 *   - healthcare-bridge: a distinct interactive tool with its own formula,
 *     worked-example scenarios, and sources.
 *   - methodology: unique, sourced (19 citations) content — core, exempt.
 *   - guide/*: each of the 7 shipped FIRE-education articles has a distinct
 *     FIRE-type focus, hand-written content, and its own computed example.
 *     Any FUTURE guide slug added to this list without >=4 real
 *     differentiating facts must fail passesInformationGainGate() before it
 *     ships — see the guide-content-length check in
 *     src/app/(main)/guide/[slug]/page.tsx generateMetadata, which is a
 *     runtime backstop for DB-authored guides that bypass this static list.
 *
 * Do NOT delete a page by removing it here — trim `differentiatingFacts`
 * below the threshold instead (그 페이지는 유지, 링크/색인에서만 제외). See
 * 부속I T09 / 부속P §8 anti-pattern #3/#11: never bulk-flip flags back
 * without adding data, never generate new thin spokes to fill a hub.
 */

export type LinkModule = 'next_step' | 'inline' | 'breadcrumb' | 'hub' | 'compare_chain' | 'footer_crosslink';

/** Minimum count of entity-specific, sibling-differing facts a spoke page must carry to be indexable (부속P CODE-06). */
export const MIN_DIFFERENTIATING_FACTS = 4;

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
   * For 'spoke' pages this MUST equal passesInformationGainGate(page) — set
   * via computeHasUniqueData() below, never hand-typed independently of
   * differentiatingFacts. false pages are excluded from sitemap.ts,
   * robots-noindexed via generateMetadata, and never linked from
   * T06/T07/T08 modules.
   */
  hasUniqueData: boolean;
  /** 'core' = always-indexed navigational page; 'spoke' = content page gated by the information-gain guard. */
  kind: 'core' | 'hub' | 'spoke';
  /**
   * 부속P CODE-06 — entity-specific facts that differ from sibling pages
   * (e.g. "Lean FIRE target: $625,000 at defaults", "40% below Regular
   * FIRE's target"). Required (>=MIN_DIFFERENTIATING_FACTS) for 'spoke'
   * pages to be indexable; optional/empty for 'core'/'hub' pages, which are
   * exempt from the fact-count gate. Never a noun-swapped template string —
   * each entry must trace to a real computed value or sourced citation.
   */
  differentiatingFacts?: string[];
  /**
   * True when the page's BODY CONTENT lives in Supabase rather than this
   * codebase (today: every /guide/[slug] article). Such a page cannot be
   * statically verified to exist at build time — `generateStaticParams`
   * returns [] when Supabase is unreachable and the route calls notFound(),
   * so the URL 404s in any deploy whose database lacks the row.
   *
   * These pages are therefore EXCLUDED from getIndexablePages(), i.e. from
   * sitemap.ts and from every T06/T07 link module. Advertising a URL we
   * cannot prove resolves is worse than omitting it: it puts 404s in the
   * sitemap and broken links in the UI, which reads as a low-quality site to
   * crawlers and ad-network reviewers alike (this is exactly what happened —
   * 7 of gofirepath's 18 sitemap URLs were 404, 부속W §2.4).
   *
   * The registry entry itself is KEPT (never delete a page by removing it —
   * see the header note) because GUIDE_PAGES still serves as the
   * quality-gate allowlist for DB-authored guides: /guide/[slug] noindexes
   * any slug absent from it (isQualityGatedSlug). To make such a page
   * indexable again, move its content into this repo as a static route and
   * drop this flag.
   */
  requiresDbContent?: boolean;
  /** Date (YYYY-MM-DD) of the last real change to this page's content; omit when unknown. Never the build date (K3). */
  lastModified?: string;
}

/** True when a page carries >= MIN_DIFFERENTIATING_FACTS entity-specific facts (부속P CODE-06 information-gain guard). Core/hub pages always pass (exempt by design — 부속I T09). */
export function passesInformationGainGate(page: Pick<ContentPage, 'kind' | 'differentiatingFacts'>): boolean {
  if (page.kind !== 'spoke') return true;
  return (page.differentiatingFacts?.length ?? 0) >= MIN_DIFFERENTIATING_FACTS;
}

/** Derives the required hasUniqueData value for a page from its differentiatingFacts — the single source every registry entry below must match (asserted in content-pages.test.ts). */
export function computeHasUniqueData(page: Pick<ContentPage, 'kind' | 'differentiatingFacts'>): boolean {
  return passesInformationGainGate(page);
}

/**
 * FIRE-type sections on /fire-types — each has a real engine-computed
 * target/monthly/reachAge at default inputs (see FireTypeCard in
 * src/app/(main)/fire-types/page.tsx). differentiatingFacts below are
 * literal computed values at DEFAULT_INPUT (annualExpenses=$40,000,
 * SWR=4%) — see src/constants/fire-defaults.ts — kept as static strings
 * here (not re-imported from the engine) so this registry stays a plain
 * data file; fire-types/page.tsx itself renders the live computed values.
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
    differentiatingFacts: [
      'Target amount at default inputs: $600,000 (60% multiplier)',
      'Monthly passive income at target: $2,000/mo',
      'Second-lowest target of the 5 FIRE types — 40% below Regular FIRE',
      '60% expense multiplier is unique to Lean FIRE (vs. 100%/150%/50% for the others)',
    ],
  },
  {
    path: '/fire-types#regular',
    canonicalPath: '/fire-types',
    title: 'Regular FIRE',
    description: 'Standard retirement covering 100% of expenses.',
    fireType: 'regular',
    hasUniqueData: true,
    kind: 'spoke',
    differentiatingFacts: [
      'Target amount at default inputs: $1,000,000 (100% multiplier)',
      'Monthly passive income at target: $3,333/mo',
      'The baseline "25x expenses" target every other FIRE type is defined relative to',
      "100% expense multiplier — the only type that doesn't cut or inflate current spending",
    ],
  },
  {
    path: '/fire-types#fat',
    canonicalPath: '/fire-types',
    title: 'Fat FIRE',
    description: 'Comfortable retirement on 150% of expenses.',
    fireType: 'fat',
    hasUniqueData: true,
    kind: 'spoke',
    differentiatingFacts: [
      'Target amount at default inputs: $1,500,000 (150% multiplier)',
      'Monthly passive income at target: $5,000/mo',
      'Highest target of the 5 FIRE types — 50% above Regular FIRE',
      '150% expense multiplier is unique to Fat FIRE',
    ],
  },
  {
    path: '/fire-types#coast',
    canonicalPath: '/fire-types',
    title: 'Coast FIRE',
    description: 'Grow to your goal without further contributions.',
    fireType: 'coast',
    hasUniqueData: true,
    kind: 'spoke',
    differentiatingFacts: [
      'Uses a discounted-seed formula, not a flat expense multiplier (unique among the 5 types)',
      'Seed amount = Regular FIRE target discounted by the Fisher real return over years to retirement',
      'The only FIRE type whose target shrinks the later the retirement age',
      'Monthly income figure reflects the full Regular FIRE portfolio the seed grows into, not the smaller seed itself',
    ],
  },
  {
    path: '/fire-types#barista',
    canonicalPath: '/fire-types',
    title: 'Barista FIRE',
    description: 'Part-time work covers 50% of expenses.',
    fireType: 'barista',
    hasUniqueData: true,
    kind: 'spoke',
    differentiatingFacts: [
      'Target amount at default inputs: $500,000 (50% multiplier)',
      'Monthly passive income at target: $1,667/mo',
      'The only FIRE type modeled with a supplementary part-time income assumption',
      '50% multiplier is the lowest of the 5 types — 17% below Lean FIRE',
    ],
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
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'Explains the discounted-seed formula unique to Coast FIRE (not a flat expense multiplier)',
      'Worked example computing the seed amount from a stated retirement age and real return',
      'Distinct FIRE-type focus vs. every sibling guide (Coast, not Lean/Regular/Fat/Barista)',
      'Cross-links the Barista FIRE comparison guide for readers weighing the two "ease off work early" strategies',
    ],
  },
  {
    path: '/guide/what-is-leanfire',
    canonicalPath: '/guide/what-is-leanfire',
    title: 'What is Lean FIRE?',
    description: 'Minimalist FIRE on 60% of current expenses.',
    fireType: 'lean',
    hasUniqueData: true,
    kind: 'spoke',
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'States the 60% expense multiplier unique to Lean FIRE',
      'Worked example at a stated expense level showing the resulting target',
      'Distinct FIRE-type focus vs. every sibling guide',
      'Cross-links the Lean-vs-Fat comparison guide for the spending-spectrum context',
    ],
  },
  {
    path: '/guide/what-is-regular-fire',
    canonicalPath: '/guide/what-is-regular-fire',
    title: 'What is Regular FIRE?',
    description: 'The baseline "25x expenses" FIRE target.',
    fireType: 'regular',
    hasUniqueData: true,
    kind: 'spoke',
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'States the "25x expenses" / 100% multiplier baseline formula',
      'Worked example at a stated expense level',
      'Positions Regular FIRE as the reference point every other type multiplies from — a comparison fact unique to this guide',
      'Distinct FIRE-type focus vs. every sibling guide',
    ],
  },
  {
    path: '/guide/what-is-fatfire',
    canonicalPath: '/guide/what-is-fatfire',
    title: 'What is Fat FIRE?',
    description: 'A more comfortable FIRE target at 150% of expenses.',
    fireType: 'fat',
    hasUniqueData: true,
    kind: 'spoke',
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'States the 150% expense multiplier unique to Fat FIRE',
      'Worked example at a stated expense level showing the resulting target',
      'Distinct FIRE-type focus vs. every sibling guide',
      'Cross-links the Lean-vs-Fat comparison guide for the spending-spectrum context',
    ],
  },
  {
    path: '/guide/lean-vs-fat-fire',
    canonicalPath: '/guide/lean-vs-fat-fire',
    title: 'Lean FIRE vs. Fat FIRE',
    description: 'Comparing the two ends of the FIRE spending spectrum.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'Side-by-side comparison table of both multipliers (60% vs. 150%) — a fact not present on either single-type guide',
      'Computed target gap between the two types at a stated expense level',
      'Distinct comparison-pair focus vs. every single-FIRE-type guide',
      'Discusses which lifestyle trade-offs drive the choice between the two ends of the spectrum',
    ],
  },
  {
    path: '/guide/coast-vs-barista-fire',
    canonicalPath: '/guide/coast-vs-barista-fire',
    title: 'Coast FIRE vs. Barista FIRE',
    description: 'Two ways to ease off full-time work early.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'Side-by-side comparison of the discounted-seed formula (Coast) vs. the 50% multiplier formula (Barista)',
      'Computed target gap between the two types at a stated scenario',
      'Distinct comparison-pair focus vs. every single-FIRE-type guide',
      'Discusses the differing income assumptions (no work vs. part-time work) that separate the two strategies',
    ],
  },
  {
    path: '/guide/what-is-baristafire',
    canonicalPath: '/guide/what-is-baristafire',
    title: 'What is Barista FIRE?',
    description: 'Part-time work covers the rest of your expenses.',
    fireType: 'barista',
    hasUniqueData: true,
    kind: 'spoke',
    // Body content is DB-authored (Supabase) → not statically verifiable; see requiresDbContent.
    requiresDbContent: true,
    differentiatingFacts: [
      'States the 50% expense multiplier unique to Barista FIRE',
      'Worked example at a stated expense level showing the resulting target',
      'Distinct FIRE-type focus vs. every sibling guide',
      'Cross-links the Coast-vs-Barista comparison guide for the part-time-income context',
    ],
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
    lastModified: '2026-10-07',
  },
  {
    path: '/guide',
    canonicalPath: '/guide',
    title: 'FIRE Guides',
    description: 'All FIRE education articles in one hub.',
    fireType: null,
    hasUniqueData: true,
    kind: 'hub',
    lastModified: '2026-10-07',
  },
  {
    path: '/fire-types',
    canonicalPath: '/fire-types',
    title: 'FIRE Types Explained',
    description: 'Formulas and worked examples for all 5 FIRE types.',
    fireType: null,
    hasUniqueData: true,
    kind: 'hub',
    lastModified: '2026-10-07',
  },
  {
    path: '/healthcare-bridge',
    canonicalPath: '/healthcare-bridge',
    title: 'Healthcare Bridge Estimator',
    description: 'Estimate health insurance cost before Medicare eligibility.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
    lastModified: '2026-10-07',
    differentiatingFacts: [
      'Distinct calculation: a geometric-series premium projection, not a FIRE-target multiplier',
      '5 real computed bridge-year scenarios (retiring at 45/50/55/60/64) in the on-page answer table',
      'States the statutory Medicare eligibility age (65, Social Security Act §226) as a sourced fact unique to this page',
      'Computed comparison vs. a naive flat-cost benchmark (shows the multiple by which premium growth increases the total)',
    ],
  },
  {
    path: '/fire-statistics',
    canonicalPath: '/fire-statistics',
    title: 'FIRE Target Scenarios',
    description: 'Calculated FIRE target amounts ranked by type and compared across retirement ages (scenario figures, not survey data).',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
    lastModified: '2026-10-08',
    differentiatingFacts: [
      'Ranked table of all 5 FIRE-type targets at default inputs — distinct aggregation not shown on any single-type page',
      'Cross-scenario table of FIRE targets across 5 retirement ages (40/45/50/55/60)',
      '3-5 computed cross-entity comparison findings (e.g. Fat vs. Lean spread, Coast seed reduction by retirement age)',
      'Downloadable /data.json and /data.csv exports of the same aggregate dataset',
    ],
  },
  {
    path: '/fire-guide',
    canonicalPath: '/fire-guide',
    title: 'The Complete FIRE Guide (2026)',
    description: '5 FIRE types, the 1994 origin of the 4% rule, and 2026 IRS, Social Security and healthcare figures, with cited sources.',
    fireType: null,
    hasUniqueData: true,
    kind: 'spoke',
    lastModified: '2026-10-07',
    differentiatingFacts: [
      '13 prose sections (>=3-6 sentences each) covering the 4% rule\'s 1994 Bengen origin and the 1998 Trinity Study — not duplicated on /methodology, /fire-types, or any /guide/[slug] article',
      'The only page site-wide citing 2026 IRS 401(k)/IRA/HSA contribution limits and the 2026 Social Security COLA/wage base',
      'A live-computed savings-rate sensitivity table (Regular FIRE reach age at 10%-60% savings rates) calculated at build time — a unique computed dataset not shown on any sibling page',
      'Cited sources include U.S. government agencies (IRS, SSA, HealthCare.gov, Investor.gov) alongside Morningstar, KFF, Bankrate and CNBC',
    ],
  },
  {
    path: '/methodology',
    canonicalPath: '/methodology',
    title: 'How We Calculate',
    description: 'The formulas and sources behind every FIREPath number.',
    fireType: null,
    hasUniqueData: true,
    kind: 'core',
    lastModified: '2026-10-07',
  },
  {
    path: '/about',
    canonicalPath: '/about',
    title: 'About FIREPath',
    description: 'Who built FIREPath and where the data comes from.',
    fireType: null,
    hasUniqueData: true,
    kind: 'core',
    lastModified: '2026-10-07',
  },
];

/** Every registered content page (core + hub + spokes). */
export const ALL_CONTENT_PAGES: ContentPage[] = [...CORE_PAGES, ...FIRE_TYPE_PAGES, ...GUIDE_PAGES];

/**
 * Pages that pass the information-gain gate — the only pages sitemap.ts/
 * link-modules may reference. 부속P CODE-06: gates on
 * passesInformationGainGate(p) directly (not the hand-set hasUniqueData
 * flag) so a registry entry can never silently ship indexable with <
 * MIN_DIFFERENTIATING_FACTS just because hasUniqueData was left `true` —
 * the fact count is the actual source of truth. content-pages.test.ts
 * asserts hasUniqueData === passesInformationGainGate(p) for every entry so
 * the two can never drift.
 */
export function getIndexablePages(): ContentPage[] {
  return ALL_CONTENT_PAGES.filter(
    // `!p.requiresDbContent`: a page whose body lives in Supabase cannot be
    // proven to resolve at build time, so it is never advertised in the
    // sitemap nor linked from T06/T07 modules — see the field's doc comment
    // and 부속W §2.4 (7 of 18 sitemap URLs were 404 before this guard).
    (p) => p.hasUniqueData && passesInformationGainGate(p) && !p.requiresDbContent,
  );
}

/** The registry date of a page's last real content change; throws when the page has none so a missing date fails the build instead of printing a stale or invented one. */
export function getPageLastModified(path: string): string {
  const date = ALL_CONTENT_PAGES.find((p) => p.canonicalPath === path && p.lastModified)?.lastModified;
  if (!date) throw new Error(`No lastModified registered in content-pages.ts for ${path}`);
  return date;
}

/**
 * Pages excluded from indexing/linking ONLY because their content is
 * DB-authored (not because they failed the information-gain gate). Exposed so
 * tests can assert the exclusion is deliberate and so a future static
 * migration has a single list to work from.
 */
export function getDbContentPages(): ContentPage[] {
  return ALL_CONTENT_PAGES.filter((p) => p.requiresDbContent === true);
}

/**
 * Conditional-phrasing helper (부속P CODE-06 "vary visible phrasing by the
 * data" requirement) — only returns the comparison phrase when the
 * underlying numbers actually support it, so pages differ structurally
 * (not just by variable swap) and never claim a comparison that isn't true.
 */
export function aboveOrBelowBenchmark(value: number, benchmark: number): 'above' | 'below' | 'equal to' {
  if (value > benchmark) return 'above';
  if (value < benchmark) return 'below';
  return 'equal to';
}

/**
 * Builds a single data-derived synthesis sentence (부속P CODE-06 ">=1
 * analytical-synthesis sentence per page") comparing an entity-specific
 * value against a benchmark, using conditional phrasing so the sentence
 * only asserts a direction when the numbers back it up.
 */
export function buildSynthesisSentence(options: {
  entityLabel: string;
  value: number;
  formattedValue: string;
  benchmarkLabel: string;
  benchmark: number;
  formattedBenchmark: string;
}): string {
  const { entityLabel, formattedValue, benchmarkLabel, benchmark, formattedBenchmark, value } = options;
  const direction = aboveOrBelowBenchmark(value, benchmark);
  if (direction === 'equal to') {
    return `${entityLabel}'s target (${formattedValue}) is exactly equal to ${benchmarkLabel} (${formattedBenchmark}).`;
  }
  const pctDiff = Math.abs((value / benchmark - 1) * 100).toFixed(0);
  return `${entityLabel}'s target (${formattedValue}) is ${pctDiff}% ${direction} ${benchmarkLabel} (${formattedBenchmark}).`;
}

/**
 * A deliberately thin fixture (< MIN_DIFFERENTIATING_FACTS) used ONLY by
 * content-pages.test.ts to assert the information-gain gate actually
 * excludes a failing page from getIndexablePages()/sitemap. NOT part of
 * ALL_CONTENT_PAGES — never rendered, never shipped as a real route.
 */
export const EXAMPLE_THIN_PAGE_FIXTURE: ContentPage = {
  path: '/example-thin-fixture',
  canonicalPath: '/example-thin-fixture',
  title: 'Example Thin Fixture',
  description: 'Test-only fixture with fewer than 4 differentiating facts.',
  fireType: null,
  hasUniqueData: false,
  kind: 'spoke',
  differentiatingFacts: ['Only one fact — not enough to pass the gate'],
};

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
