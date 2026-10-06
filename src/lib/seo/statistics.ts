/**
 * lib/seo/statistics.ts — 부속P CODE-04 statistics aggregation.
 *
 * Aggregates the SAME compute engine used by the calculator (calculateFIRE)
 * across a fixed matrix of real scenarios into original, citable statistics
 * for the /fire-statistics "linkable asset" page: a headline stat, a ranked
 * table, and 3-5 one-line quotable findings. Every number here is derived
 * from calculateFIRE()/figures.ts — nothing is fabricated or hand-typed.
 *
 * The scenario matrix is deliberately small and fixed (5 target-retirement-age
 * scenarios x 5 FIRE types = 25 real computed data points) rather than a
 * combinatorial explosion — this is a single aggregate statistics page, not
 * a programmatic page farm (부속P §8 anti-pattern #11).
 */

import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';
import { FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import { formatCurrencyFull } from '@/lib/utils/format';
import { CORE_FIGURES } from '@/lib/figures';
import { getPageLastModified } from '@/lib/content-pages';
import type { FIREType } from '@/types/fire.types';

/** Retirement-age scenarios aggregated for the cross-scenario comparison table. */
export const STATISTICS_RETIREMENT_AGE_SCENARIOS = [40, 45, 50, 55, 60] as const;

export interface StatisticsScenarioRow {
  retirementAge: number;
  targets: Record<FIREType, number>;
}

export interface StatisticsFireTypeRow {
  type: FIREType;
  label: string;
  multiplier: number | 'discounted seed';
  targetAmount: number;
  monthlyPassiveIncome: number;
}

export interface FireStatisticsDataset {
  /** ISO date of the last real change to the figures (the /fire-statistics registry date). */
  lastUpdated: string;
  /** Headline stat sentence — the single most citable number on the page. */
  headline: {
    text: string;
    value: string;
  };
  /** Ranked (descending by targetAmount) per-FIRE-type breakdown at default inputs. */
  rankedFireTypes: StatisticsFireTypeRow[];
  /** Cross-scenario table: FIRE target amounts at 5 different retirement ages. */
  scenarios: StatisticsScenarioRow[];
  /** 3-5 one-line, pull-quote-ready findings computed from the dataset above. */
  findings: string[];
  sources: { label: string; url: string }[];
}

function fmtShort(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

/** Builds the full statistics dataset. Pure function — same output every call (no randomness; the date is the registry date). */
export function buildFireStatisticsDataset(): FireStatisticsDataset {
  const { results: defaultResults } = calculateFIRE(DEFAULT_INPUT);

  const rankedFireTypes: StatisticsFireTypeRow[] = FIRE_TYPES.map((type) => ({
    type,
    label: FIRE_LABELS[type],
    multiplier: type === 'coast' ? ('discounted seed' as const) : FIRE_MULTIPLIERS[type],
    targetAmount: defaultResults[type].targetAmount,
    monthlyPassiveIncome: defaultResults[type].monthlyPassiveIncome,
  })).sort((a, b) => b.targetAmount - a.targetAmount);

  const scenarios: StatisticsScenarioRow[] = STATISTICS_RETIREMENT_AGE_SCENARIOS.map((retirementAge) => {
    const { results } = calculateFIRE({ ...DEFAULT_INPUT, retirementAge });
    const targets = Object.fromEntries(
      FIRE_TYPES.map((type) => [type, results[type].targetAmount])
    ) as Record<FIREType, number>;
    return { retirementAge, targets };
  });

  const fatRow = rankedFireTypes.find((r) => r.type === 'fat')!;
  const leanRow = rankedFireTypes.find((r) => r.type === 'lean')!;
  const baristaRow = rankedFireTypes.find((r) => r.type === 'barista')!;
  const regularRow = rankedFireTypes.find((r) => r.type === 'regular')!;

  const fatVsLeanPct = ((fatRow.targetAmount / leanRow.targetAmount - 1) * 100).toFixed(0);
  const regularVsBaristaPct = ((regularRow.targetAmount / baristaRow.targetAmount - 1) * 100).toFixed(0);

  const youngest = scenarios[0];
  const oldest = scenarios[scenarios.length - 1];
  const coastYoungest = youngest.targets.coast;
  const coastOldest = oldest.targets.coast;
  const coastReductionPct = ((1 - coastOldest / coastYoungest) * 100).toFixed(0);

  const findings: string[] = [
    `Fat FIRE requires ${fatVsLeanPct}% more than Lean FIRE at the same $${DEFAULT_INPUT.annualExpenses.toLocaleString()}/yr expense base (${formatCurrencyFull(fatRow.targetAmount)} vs. ${formatCurrencyFull(leanRow.targetAmount)}).`,
    `Regular FIRE's target is ${regularVsBaristaPct}% higher than Barista FIRE's (${formatCurrencyFull(regularRow.targetAmount)} vs. ${formatCurrencyFull(baristaRow.targetAmount)}), the exact gap made up by part-time income in the Barista strategy.`,
    `Retiring at ${oldest.retirementAge} instead of ${youngest.retirementAge} cuts the Coast FIRE seed amount needed today by ${coastReductionPct}% (${formatCurrencyFull(coastYoungest)} to ${formatCurrencyFull(coastOldest)}), because the portfolio has more years to compound.`,
    `Across all 5 retirement-age scenarios (${youngest.retirementAge}-${oldest.retirementAge}), the Regular FIRE target stays flat at ${formatCurrencyFull(regularRow.targetAmount)} — the "25x expenses" target does not depend on retirement age, only on annual expenses and SWR.`,
    `The default ${(CORE_FIGURES.safeWithdrawalRate.value * 100).toFixed(0)}% Safe Withdrawal Rate means every $1,000/yr of expenses adds ${formatCurrencyFull(1000 / CORE_FIGURES.safeWithdrawalRate.value)} to every FIRE type's target.`,
  ];

  return {
    lastUpdated: getPageLastModified('/fire-statistics'),
    headline: {
      text: `At the default ${(CORE_FIGURES.safeWithdrawalRate.value * 100).toFixed(0)}% Safe Withdrawal Rate and $${DEFAULT_INPUT.annualExpenses.toLocaleString()}/yr expenses, FIRE targets range from ${formatCurrencyFull(leanRow.targetAmount)} (Lean) to ${formatCurrencyFull(fatRow.targetAmount)} (Fat) — a ${fatVsLeanPct}% spread across the 5 FIRE types.`,
      value: `${formatCurrencyFull(leanRow.targetAmount)} – ${formatCurrencyFull(fatRow.targetAmount)}`,
    },
    rankedFireTypes,
    scenarios,
    findings,
    sources: [
      { label: 'Trinity Study (1998) — Safe Withdrawal Rate', url: CORE_FIGURES.safeWithdrawalRate.source! },
      { label: 'NYU Stern historical U.S. equity return data', url: CORE_FIGURES.expectedReturn.source! },
      { label: 'U.S. Inflation Calculator — historical CPI data', url: CORE_FIGURES.inflation.source! },
    ],
  };
}

/** Small helper re-exported for the OG image / page so they never diverge from fmtShort's rounding. */
export { fmtShort as formatShortCurrency };
