/**
 * ad-density.ts — CODE-06 (부속W §5): ad-density ceilings for FIREPath, as code.
 *
 * WHY
 * AdSense's publisher policy forbids "screens with more ads or other paid
 * promotional material than publisher-content". FIREPath is exactly the shape of
 * site that trips that clause by accident: the home route is a calculator whose
 * visible payload is five result cards and a chart, so a single extra unit can
 * outweigh the prose around it. All ten domains in this portfolio share ONE
 * publisher id (ca-pub-1378312299412437), so a density violation here is a
 * portfolio-wide risk. The ceilings therefore live in code with tests, not in a
 * reviewer's memory.
 *
 * WHERE EACH LIMIT IS ENFORCED
 *   - Structural caps (units per route, at most one before the content starts)
 *     are asserted against the real route sources in
 *     `src/lib/__tests__/ad-density.test.ts`. Source order is what a crawler and
 *     a reviewer with JS disabled see, so it is the honest unit of measurement.
 *   - Ratio limits (reserved ad height vs content height, words of publisher
 *     prose per unit) are pure math here, exercised by the same test with
 *     representative word counts. They are NOT claimed as a measurement of the
 *     live pages: this repo's vitest environment is `node` with no DOM (see
 *     src/lib/__tests__/analytics.test.ts for that documented choice), and the
 *     calculator's real content is assembled client-side, so a unit test cannot
 *     honestly count the rendered page. Measuring the deployed HTML is owner /
 *     portfolio tooling, not something this repo pretends to do.
 *
 * NOT A REVENUE KNOB: raising these numbers to compensate for low traffic is
 * anti-pattern 9 in 부속W §7 — density does not add revenue, it loses approval.
 */

/** Hard ceilings. Raising any value requires a policy review, not a refactor. */
export const AD_DENSITY_LIMITS = {
  /** Ad units allowed per route, counting every provider slot. */
  maxUnitsPerRoute: 3,
  /**
   * Units allowed before the publisher content begins. "Above the fold" is
   * approximated by source order rather than a pixel measurement, because
   * source order is what both a crawler and a reviewer with JS disabled see.
   */
  maxUnitsBeforeContent: 1,
  /** Words of publisher prose required per ad unit. 3 units => 1,200+ words. */
  minContentWordsPerUnit: 400,
  /** Reserved ad height as a share of estimated content height. */
  maxReservedHeightRatio: 0.3,
} as const;

/**
 * Reserved (CLS-preventing) height per ad format, in CSS pixels. `auto` — the
 * default format of `AdSlot` — is billed at 280px because that is the desktop
 * reservation both `AdSlot` (`min-h-[100px] md:min-h-[280px]`) and
 * `ResultMonetization`'s DisplaySlot wrapper actually declare. The reserved box
 * is what pushes content down whether or not a creative fills it, so it is the
 * numerator of the height ratio.
 */
export const RESERVED_AD_HEIGHT_PX: Record<string, number> = {
  leaderboard: 90,
  banner: 90,
  horizontal: 90,
  rectangle: 250,
  auto: 280,
  responsive: 280,
  fluid: 280,
  vertical: 600,
};

/** Unknown formats bill at the responsive height — the conservative choice. */
export const DEFAULT_RESERVED_AD_HEIGHT_PX = RESERVED_AD_HEIGHT_PX.responsive;

/**
 * Content-height estimate. A documented approximation, not a measurement: at
 * the 375px mobile viewport this app targets first, body copy runs ~11 words
 * per line at a 28px line-height, so one word ≈ 28/11 px of vertical space.
 * Always reported as an estimate.
 */
export const CONTENT_PX_PER_WORD = 28 / 11;

export function estimateContentHeightPx(words: number): number {
  return Math.max(0, words) * CONTENT_PX_PER_WORD;
}

export function reservedHeightPx(formats: readonly string[]): number {
  return formats.reduce(
    (sum, format) =>
      sum + (RESERVED_AD_HEIGHT_PX[format.toLowerCase()] ?? DEFAULT_RESERVED_AD_HEIGHT_PX),
    0
  );
}

export interface AdDensityInput {
  /** Every ad unit on the route, by format (one entry per unit). */
  unitFormats: readonly string[];
  /** Words of publisher prose on the route, excluding nav/header/footer. */
  contentWords: number;
  /** Units appearing before the first publisher content, by source order. */
  unitsBeforeContent?: number;
}

export interface AdDensityResult {
  unitCount: number;
  reservedPx: number;
  /** Estimated, per CONTENT_PX_PER_WORD — never presented as a measurement. */
  estimatedContentPx: number;
  heightRatio: number;
  wordsPerUnit: number;
  violations: string[];
  withinLimits: boolean;
}

/**
 * Evaluates one route against every limit. Zero ad units is always compliant —
 * a page with no inventory cannot be ad-heavy, and `AdSlot` renders nothing at
 * all until a numeric slot id resolves (CODE-01, see lib/ad-slots.ts), so most
 * routes in a slot-less build legitimately score zero.
 */
export function evaluateAdDensity(input: AdDensityInput): AdDensityResult {
  const unitCount = input.unitFormats.length;
  const reservedPx = reservedHeightPx(input.unitFormats);
  const estimatedContentPx = estimateContentHeightPx(input.contentWords);
  const heightRatio =
    estimatedContentPx > 0 ? reservedPx / estimatedContentPx : unitCount > 0 ? Infinity : 0;
  const wordsPerUnit = unitCount > 0 ? input.contentWords / unitCount : Infinity;
  const unitsBeforeContent = input.unitsBeforeContent ?? 0;

  const violations: string[] = [];
  if (unitCount > AD_DENSITY_LIMITS.maxUnitsPerRoute) {
    violations.push(
      `${unitCount} ad units exceeds the per-route cap of ${AD_DENSITY_LIMITS.maxUnitsPerRoute}`
    );
  }
  if (unitsBeforeContent > AD_DENSITY_LIMITS.maxUnitsBeforeContent) {
    violations.push(
      `${unitsBeforeContent} ad units precede the publisher content (cap ${AD_DENSITY_LIMITS.maxUnitsBeforeContent})`
    );
  }
  if (unitCount > 0 && wordsPerUnit < AD_DENSITY_LIMITS.minContentWordsPerUnit) {
    violations.push(
      `${Math.round(wordsPerUnit)} words per ad unit is below the floor of ${AD_DENSITY_LIMITS.minContentWordsPerUnit}`
    );
  }
  if (unitCount > 0 && heightRatio > AD_DENSITY_LIMITS.maxReservedHeightRatio) {
    violations.push(
      `reserved ad height is ${(heightRatio * 100).toFixed(1)}% of estimated content height (cap ${(AD_DENSITY_LIMITS.maxReservedHeightRatio * 100).toFixed(0)}%)`
    );
  }

  return {
    unitCount,
    reservedPx,
    estimatedContentPx,
    heightRatio,
    wordsPerUnit,
    violations,
    withinLimits: violations.length === 0,
  };
}

/**
 * The component names THIS repo uses to place ads. Counting entry points rather
 * than `<ins class="adsbygoogle">` is what makes the cap checkable from source:
 * the `<ins>` element is emitted deep inside `AdSlot`, and the server components
 * that mount ads need request data (premium status) to render.
 *
 * Every name here is a real call site in this repo:
 *   - `AdSlot`             src/components/common/ad-slot.tsx — emits the <ins>;
 *                          mounted directly by the two /guide routes.
 *   - `AdProvider`         src/components/monetization/AdProvider.tsx — the
 *                          single programmatic-network selector wrapping AdSlot.
 *   - `DisplaySlot`        the local wrapper inside ResultMonetization.tsx that
 *                          reserves height around AdProvider.
 *   - `ResultMonetization` src/components/monetization/ResultMonetization.tsx —
 *                          the stack the / and /result routes mount, which
 *                          contains exactly one DisplaySlot.
 * Nesting is why these all count as one entry point each: a route that mounts
 * ResultMonetization gets one display unit, and the test measures per route
 * source, so wrappers are never double-counted.
 */
export const AD_ENTRY_POINTS = [
  'AdSlot',
  'AdProvider',
  'DisplaySlot',
  'ResultMonetization',
] as const;

/**
 * Counts ad-entry-point elements in a route's SOURCE.
 *
 * Comments are stripped first. This repo's ad files are heavily commented and
 * several comments name the components precisely to record that they must NOT
 * be mounted there (e.g. the exclusion-zone notes in calculator-client.tsx and
 * the K05 audit prose), so counting raw substrings would flag documentation as
 * a placement.
 */
export function countAdEntryPoints(
  source: string,
  entryPoints: readonly string[] = AD_ENTRY_POINTS
): number {
  const withoutComments = source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
  let count = 0;
  for (const name of entryPoints) {
    const matches = withoutComments.match(new RegExp(`<${name}\\b`, 'g'));
    count += matches ? matches.length : 0;
  }
  return count;
}
