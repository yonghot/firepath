/**
 * figures.ts — central metadata registry for hardcoded assumption defaults.
 *
 * P0 compliance requirement: every hardcoded figure that drives calculator
 * results must carry { asOf, source } metadata, and the methodology page
 * shows which defaults have a recorded source check (SOURCE_CHECKS below,
 * mirrored in docs/source-checks.md).
 *
 * RULES:
 *   - Only dates/sources that are ALREADY RECORDED elsewhere in this repo
 *     (methodology page citations, docs/source-checks.md) are used here.
 *   - Never invent a date or URL. If a figure has no recorded source, set
 *     asOf/source to null — do NOT fabricate.
 *   - A page may say a figure was "checked" or "verified" only for an id in
 *     SOURCE_CHECKS (K30(5)).
 *   - This file does NOT change any calculation logic or default values.
 *     It only attaches provenance metadata to values that already exist in
 *     src/constants/fire-defaults.ts and src/lib/engine/portfolio-optimizer.ts.
 */

export interface FigureMeta {
  /** Human label for the figure. */
  label: string;
  /** The default value as already defined in its source-of-truth file. */
  value: number;
  /** ISO date (YYYY-MM-DD) the default value was in force and recorded here, or null if unrecorded. Not a verification claim. */
  asOf: string | null;
  /** Primary source URL, or null if unverified. */
  source: string | null;
  /** Short note on what the source supports. */
  note: string;
}

/**
 * Date the core FIRE assumption defaults (expected return, inflation, safe
 * withdrawal rate) were recorded as in force — the 2026-06-29 credibility
 * pass in PROGRESS.md. It says which values were current, not that a source
 * was re-read, and appears only in the methodology assumptions table.
 */
export const CORE_ASSUMPTIONS_AS_OF = '2026-06-29';

/** Source checks on record in docs/source-checks.md; the only basis for "checked" wording on the site. */
export const SOURCE_CHECKS = {
  'nyu-histretsp': { date: '2026-10-07' },
  'morningstar-finding-swr': { date: '2026-10-07' },
} as const;

/**
 * Core FIRE-engine assumption defaults with provenance.
 * Values mirror src/constants/fire-defaults.ts SLIDER_CONFIGS — this file
 * does not redefine or override those values, only documents their source.
 */
export const CORE_FIGURES: Record<string, FigureMeta> = {
  expectedReturn: {
    label: 'Expected annual investment return (nominal)',
    value: 0.07,
    asOf: CORE_ASSUMPTIONS_AS_OF,
    source: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html',
    note:
      'FIREPath default assumption, adjustable. Set below the long-run U.S. stock returns that NYU Stern reports (/methodology source 6). See docs/source-checks.md.',
  },
  inflation: {
    label: 'Expected annual inflation rate',
    value: 0.03,
    asOf: CORE_ASSUMPTIONS_AS_OF,
    source: 'https://www.usinflationcalculator.com/inflation/historical-inflation-rates/',
    note:
      'U.S. Inflation Calculator historical CPI data; Federal Reserve inflation FAQ for long-run target context. See /methodology sources 8–9.',
  },
  safeWithdrawalRate: {
    label: 'Safe Withdrawal Rate (4% rule)',
    value: 0.04,
    asOf: CORE_ASSUMPTIONS_AS_OF,
    source: 'https://en.wikipedia.org/wiki/Trinity_study',
    note:
      'Bengen (1994) 4% rule, popularized by the Trinity Study (1998). Morningstar\'s updated safe-starting-rate research (3.7%–4.0%) is cited as a caveat on /methodology. See /methodology sources 1, 4, 5, 12.',
  },
  monteCarloVolatility: {
    label: 'Market volatility assumption (Monte Carlo)',
    value: 0.15,
    asOf: CORE_ASSUMPTIONS_AS_OF,
    source: 'https://ycharts.com/indices/%5ESPX/monthly_standard_deviation_annualized_all',
    note: 'YCharts historical S&P 500 annualized volatility data. See /methodology source 16.',
  },
};

/** Source-attributed line shown with the 7% default wherever an answer block lists it. */
export const EXPECTED_RETURN_STAT = {
  text: `${Math.round(CORE_FIGURES.expectedReturn.value * 100)}% default nominal expected return (FIREPath assumption you can adjust, set below long-run U.S. stock returns)`,
  sourceLabel: 'NYU Stern historical U.S. equity return data',
  sourceUrl: CORE_FIGURES.expectedReturn.source!,
};

/**
 * Figures referenced elsewhere in the app that do NOT yet have a verified
 * source/date in repo docs. Listed here (not fabricated) per the P0 mandate:
 * "if unknown, set asOf to null and list the figure — DO NOT invent."
 *
 * Source: src/lib/engine/portfolio-optimizer.ts ASSET_CLASSES (premium-only
 * Portfolio Optimization feature). Comment there labels these "historical
 * approximations" but cites no specific source/date in repo docs/tests.
 */
export const UNSOURCED_FIGURES: FigureMeta[] = [
  {
    label: 'US Stocks expected return / volatility (portfolio optimizer)',
    value: 0.1,
    asOf: null,
    source: null,
    note: 'ASSET_CLASSES.us_stocks: expectedReturn 10%, volatility 15% — no citation in repo docs/tests.',
  },
  {
    label: "Int'l Stocks expected return / volatility (portfolio optimizer)",
    value: 0.08,
    asOf: null,
    source: null,
    note: 'ASSET_CLASSES.intl_stocks: expectedReturn 8%, volatility 17% — no citation in repo docs/tests.',
  },
  {
    label: 'Bonds expected return / volatility (portfolio optimizer)',
    value: 0.04,
    asOf: null,
    source: null,
    note: 'ASSET_CLASSES.bonds: expectedReturn 4%, volatility 5% — no citation in repo docs/tests.',
  },
  {
    label: 'Cash / Money Market expected return / volatility (portfolio optimizer)',
    value: 0.02,
    asOf: null,
    source: null,
    note: 'ASSET_CLASSES.cash: expectedReturn 2%, volatility 1% — no citation in repo docs/tests.',
  },
  {
    label: 'Asset-class correlation matrix (portfolio optimizer)',
    value: NaN,
    asOf: null,
    source: null,
    note: 'CORRELATIONS matrix in portfolio-optimizer.ts is labeled "simplified" — no citation in repo docs/tests.',
  },
];

/** Link to the sources and methodology page shown beside the result disclaimer. */
export function getFiguresPrimarySource(): { label: string; url: string } {
  return {
    label: 'Methodology & sources',
    url: '/methodology',
  };
}
