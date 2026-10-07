/**
 * lib/seo/statistics.ts — 부속P CODE-04 statistics aggregation.
 *
 * Aggregates the SAME compute engine used by the calculator (calculateFIRE)
 * across a fixed matrix of real scenarios into citable scenario figures
 * (calculated, not survey data) for the /fire-statistics page: a headline figure, a ranked
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
  /** What targetAmount is: Coast FIRE's is the seed needed today, not a full target. */
  targetMeaning: string;
  /** What monthlyPassiveIncome is paid from. */
  monthlyMeaning: string;
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
  /** Sentence under the retirement-age table: which targets ignore retirement age and which way the Coast seed moves. */
  retirementAgeNote: string;
  sources: { label: string; url: string }[];
}

const PER_EXPENSE_INCREMENT = 1000;

const shortName = (type: FIREType): string => FIRE_LABELS[type].replace(/ FIRE$/, '');

function joinNames(names: string[]): string {
  if (names.length < 2) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}

/** Lowest and highest target among the types whose target is an expense multiple (Coast is a discounted seed and is not comparable). */
export function expenseMultipleExtremes(rows: StatisticsFireTypeRow[]): {
  count: number;
  lowest: StatisticsFireTypeRow;
  highest: StatisticsFireTypeRow;
} {
  const multiple = rows.filter((r) => r.multiplier !== 'discounted seed');
  return {
    count: multiple.length,
    lowest: multiple.reduce((a, b) => (b.targetAmount < a.targetAmount ? b : a)),
    highest: multiple.reduce((a, b) => (b.targetAmount > a.targetAmount ? b : a)),
  };
}

function fmtShort(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

export function targetMeaning(type: FIREType): string {
  return type === 'coast' ? 'Seed needed today (the Regular FIRE target discounted to today)' : 'Target amount';
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
    targetMeaning: targetMeaning(type),
    monthlyMeaning:
      type === 'coast'
        ? 'Monthly passive income at retirement, from the full Regular FIRE target'
        : 'Monthly passive income at the target',
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
  const coastShrinks = coastOldest < coastYoungest;
  const coastChangePct = (Math.abs(1 - coastOldest / coastYoungest) * 100).toFixed(0);
  const coastRow = rankedFireTypes.find((r) => r.type === 'coast')!;

  const independentOfAge = FIRE_TYPES.filter((type) =>
    scenarios.every((s) => s.targets[type] === youngest.targets[type])
  );
  const independentNames = joinNames(independentOfAge.map(shortName));

  const { results: bumpedResults } = calculateFIRE({
    ...DEFAULT_INPUT,
    annualExpenses: DEFAULT_INPUT.annualExpenses + PER_EXPENSE_INCREMENT,
  });
  const incrementClauses = rankedFireTypes.map((row) => {
    const increment = formatCurrencyFull(bumpedResults[row.type].targetAmount - row.targetAmount);
    return `${increment} to ${row.type === 'coast' ? 'the Coast FIRE seed' : row.label}`;
  });

  const swrPct = (DEFAULT_INPUT.safeWithdrawalRate * 100).toFixed(0);
  const expenses = DEFAULT_INPUT.annualExpenses.toLocaleString('en-US');
  const { count: multipleCount, lowest, highest } = expenseMultipleExtremes(rankedFireTypes);
  const spreadPct = ((highest.targetAmount / lowest.targetAmount - 1) * 100).toFixed(0);

  const findings: string[] = [
    `Fat FIRE requires ${fatVsLeanPct}% more than Lean FIRE at the same $${expenses}/yr expense base (${formatCurrencyFull(fatRow.targetAmount)} vs. ${formatCurrencyFull(leanRow.targetAmount)}).`,
    `Regular FIRE's target is ${regularVsBaristaPct}% higher than Barista FIRE's (${formatCurrencyFull(regularRow.targetAmount)} vs. ${formatCurrencyFull(baristaRow.targetAmount)}), the exact gap made up by part-time income in the Barista strategy.`,
    `Retiring at ${oldest.retirementAge} instead of ${youngest.retirementAge} ${coastShrinks ? 'cuts' : 'raises'} the Coast FIRE seed amount needed today by ${coastChangePct}% (${formatCurrencyFull(coastYoungest)} to ${formatCurrencyFull(coastOldest)})${coastShrinks ? ', because the portfolio has more years to compound' : ''}.`,
    `Across the ${scenarios.length} retirement-age scenarios (${youngest.retirementAge}-${oldest.retirementAge}), the ${independentNames} targets stay flat — Regular FIRE's, for example, is ${formatCurrencyFull(regularRow.targetAmount)} at every age — because they depend only on annual expenses and the safe withdrawal rate, not on retirement age.`,
    `At the default ${swrPct}% Safe Withdrawal Rate, every extra ${formatCurrencyFull(PER_EXPENSE_INCREMENT)}/yr of expenses adds ${joinNames(incrementClauses)}.`,
  ];

  const retirementAgeNote = `${independentNames} targets do not depend on retirement age; Coast FIRE's discounted seed amount ${coastShrinks ? 'shrinks' : 'grows'} the later you retire${coastShrinks ? ', since the portfolio has more years to compound' : ''}.`;

  return {
    lastUpdated: getPageLastModified('/fire-statistics'),
    headline: {
      text: `At the default ${swrPct}% Safe Withdrawal Rate and $${expenses}/yr expenses, targets across the ${multipleCount} expense-multiple FIRE types range from ${formatCurrencyFull(lowest.targetAmount)} (${shortName(lowest.type)}) to ${formatCurrencyFull(highest.targetAmount)} (${shortName(highest.type)}) — a ${spreadPct}% spread. Coast FIRE is not an expense multiple: it is a ${formatCurrencyFull(coastRow.targetAmount)} seed needed today.`,
      value: `${formatCurrencyFull(lowest.targetAmount)} – ${formatCurrencyFull(highest.targetAmount)}`,
    },
    rankedFireTypes,
    scenarios,
    findings,
    retirementAgeNote,
    sources: [
      { label: 'Trinity Study (1998) — Safe Withdrawal Rate', url: CORE_FIGURES.safeWithdrawalRate.source! },
      { label: 'NYU Stern historical U.S. equity return data', url: CORE_FIGURES.expectedReturn.source! },
      { label: 'U.S. Inflation Calculator — historical CPI data', url: CORE_FIGURES.inflation.source! },
    ],
  };
}

/** Small helper re-exported for the OG image / page so they never diverge from fmtShort's rounding. */
export { fmtShort as formatShortCurrency };
