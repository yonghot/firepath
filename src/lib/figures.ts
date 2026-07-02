/**
 * figures.ts — central metadata registry for hardcoded assumption defaults.
 *
 * P0 compliance requirement: every hardcoded figure that drives calculator
 * results must carry { lastVerified, source } metadata so ResultDisclaimer
 * can surface an honest "figures last updated" date and a primary-source link.
 *
 * RULES:
 *   - Only dates/sources that are ALREADY VERIFIED elsewhere in this repo
 *     (methodology page citations, PROGRESS.md fact-check log) are used here.
 *   - Never invent a date or URL. If a figure has no verified source, set
 *     lastVerified/source to null — do NOT fabricate.
 *   - This file does NOT change any calculation logic or default values.
 *     It only attaches provenance metadata to values that already exist in
 *     src/constants/fire-defaults.ts and src/lib/engine/portfolio-optimizer.ts.
 */

export interface FigureMeta {
  /** Human label for the figure. */
  label: string;
  /** The default value as already defined in its source-of-truth file. */
  value: number;
  /** ISO date (YYYY-MM-DD) the figure was last verified against its source, or null if unverified. */
  lastVerified: string | null;
  /** Primary source URL, or null if unverified. */
  source: string | null;
  /** Short note on what the source supports. */
  note: string;
}

/**
 * Dataset-level "last updated" date for the core FIRE assumption defaults
 * (expected return, inflation, safe withdrawal rate). This mirrors the
 * verified citation pass already surfaced on /methodology (see
 * src/app/(main)/methodology/page.tsx METHODOLOGY_SOURCES) and recorded in
 * PROGRESS.md's 2026-06-29 credibility-correction entry.
 */
export const CORE_ASSUMPTIONS_LAST_VERIFIED = '2026-06-29';

/**
 * Core FIRE-engine assumption defaults with provenance.
 * Values mirror src/constants/fire-defaults.ts SLIDER_CONFIGS — this file
 * does not redefine or override those values, only documents their source.
 */
export const CORE_FIGURES: Record<string, FigureMeta> = {
  expectedReturn: {
    label: 'Expected annual investment return (nominal)',
    value: 0.07,
    lastVerified: CORE_ASSUMPTIONS_LAST_VERIFIED,
    source: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html',
    note:
      'NYU Stern historical U.S. equity return data, corroborated by J.P. Morgan Long-Term Capital Market Assumptions. See /methodology sources 6–7.',
  },
  inflation: {
    label: 'Expected annual inflation rate',
    value: 0.03,
    lastVerified: CORE_ASSUMPTIONS_LAST_VERIFIED,
    source: 'https://www.usinflationcalculator.com/inflation/historical-inflation-rates/',
    note:
      'U.S. Inflation Calculator historical CPI data; Federal Reserve inflation FAQ for long-run target context. See /methodology sources 8–9.',
  },
  safeWithdrawalRate: {
    label: 'Safe Withdrawal Rate (4% rule)',
    value: 0.04,
    lastVerified: CORE_ASSUMPTIONS_LAST_VERIFIED,
    source: 'https://en.wikipedia.org/wiki/Trinity_study',
    note:
      'Bengen (1994) 4% rule, popularized by the Trinity Study (1998). Morningstar\'s updated safe-starting-rate research (3.7%–4.0%) is cited as a caveat on /methodology. See /methodology sources 1, 4, 5, 12.',
  },
  monteCarloVolatility: {
    label: 'Market volatility assumption (Monte Carlo)',
    value: 0.15,
    lastVerified: CORE_ASSUMPTIONS_LAST_VERIFIED,
    source: 'https://ycharts.com/indices/%5ESPX/monthly_standard_deviation_annualized_all',
    note: 'YCharts historical S&P 500 annualized volatility data. See /methodology source 16.',
  },
};

/**
 * Figures referenced elsewhere in the app that do NOT yet have a verified
 * source/date in repo docs. Listed here (not fabricated) per the P0 mandate:
 * "if unknown, set lastVerified to null and list the figure — DO NOT invent."
 *
 * Source: src/lib/engine/portfolio-optimizer.ts ASSET_CLASSES (premium-only
 * Portfolio Optimization feature). Comment there labels these "historical
 * approximations" but cites no specific source/date in repo docs/tests.
 */
export const UNSOURCED_FIGURES: FigureMeta[] = [
  {
    label: 'US Stocks expected return / volatility (portfolio optimizer)',
    value: 0.1,
    lastVerified: null,
    source: null,
    note: 'ASSET_CLASSES.us_stocks: expectedReturn 10%, volatility 15% — no citation in repo docs/tests.',
  },
  {
    label: "Int'l Stocks expected return / volatility (portfolio optimizer)",
    value: 0.08,
    lastVerified: null,
    source: null,
    note: 'ASSET_CLASSES.intl_stocks: expectedReturn 8%, volatility 17% — no citation in repo docs/tests.',
  },
  {
    label: 'Bonds expected return / volatility (portfolio optimizer)',
    value: 0.04,
    lastVerified: null,
    source: null,
    note: 'ASSET_CLASSES.bonds: expectedReturn 4%, volatility 5% — no citation in repo docs/tests.',
  },
  {
    label: 'Cash / Money Market expected return / volatility (portfolio optimizer)',
    value: 0.02,
    lastVerified: null,
    source: null,
    note: 'ASSET_CLASSES.cash: expectedReturn 2%, volatility 1% — no citation in repo docs/tests.',
  },
  {
    label: 'Asset-class correlation matrix (portfolio optimizer)',
    value: NaN,
    lastVerified: null,
    source: null,
    note: 'CORRELATIONS matrix in portfolio-optimizer.ts is labeled "simplified" — no citation in repo docs/tests.',
  },
];

/**
 * Returns a display-ready "figures last updated" date for the ResultDisclaimer.
 * Uses the oldest (most conservative) verified date among CORE_FIGURES so the
 * disclaimer never overstates freshness.
 */
export function getFiguresLastUpdated(): string {
  return CORE_ASSUMPTIONS_LAST_VERIFIED;
}

/** Primary-source link shown alongside the "figures last updated" line. */
export function getFiguresPrimarySource(): { label: string; url: string } {
  return {
    label: 'Methodology & sources',
    url: '/methodology',
  };
}
