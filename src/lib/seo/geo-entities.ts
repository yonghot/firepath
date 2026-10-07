/**
 * lib/seo/geo-entities.ts — shared GeoAnswerEntity for the main calculator.
 *
 * 부속P CODE-01 requires the SAME answer block to be wired into both the
 * canonical page (/) and the embeddable widget (app/embed) so cited embeds
 * carry the same passage-level GEO structure. Extracted here (rather than
 * duplicated inline in both page.tsx and embed/page.tsx) so the two call
 * sites can never drift apart.
 *
 * All figures come from calculateFIRE(DEFAULT_INPUT) — the exact engine
 * output the home page's calculator and result cards already render.
 */

import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { formatCurrencyFull, formatPercent } from '@/lib/utils/format';
import { EXPECTED_RETURN_STAT } from '@/lib/figures';
import { getPageLastModified } from '@/lib/content-pages';
import { buildAnswerBlock, type GeoAnswerEntity } from './geo';

const { annualExpenses, safeWithdrawalRate, currentAge, retirementAge } = DEFAULT_INPUT;
const { results } = calculateFIRE(DEFAULT_INPUT);

function fmtShort(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

const TRINITY_SOURCE = {
  sourceLabel: 'Trinity Study (1998)',
  sourceUrl: 'https://en.wikipedia.org/wiki/Trinity_study',
} as const;

/** One-line answer shown above the calculator on the home page (same engine output and default inputs as the answer block below). */
export const HOME_ANSWER_LEAD = {
  conditions: `age ${currentAge}, $${annualExpenses.toLocaleString('en-US')} a year in expenses, ${Number((safeWithdrawalRate * 100).toFixed(2))}% safe withdrawal rate`,
  regular: fmtShort(results.regular.targetAmount),
  lean: fmtShort(results.lean.targetAmount),
  fat: fmtShort(results.fat.targetAmount),
  ...TRINITY_SOURCE,
};

/** Shared answer block for the main FIRE calculator (home page + embed). */
export const MAIN_CALCULATOR_ANSWER: GeoAnswerEntity = buildAnswerBlock({
  query: 'How much do you need to retire early (FIRE)?',
  answer:
    `At the common defaults (age ${currentAge}, retiring by ${retirementAge}, $${annualExpenses.toLocaleString('en-US')}/yr expenses, ` +
    `${formatPercent(safeWithdrawalRate)} SWR), the baseline Regular FIRE target is ${fmtShort(results.regular.targetAmount)}. ` +
    `Lean FIRE lowers that to ${fmtShort(results.lean.targetAmount)}; Fat FIRE raises it to ${fmtShort(results.fat.targetAmount)}. ` +
    `As of ${getPageLastModified('/')}, each target equals annual expenses times a fixed multiplier, divided by the safe withdrawal rate.`,
  lastUpdated: getPageLastModified('/'),
  tableHeaders: ['FIRE Type', 'Multiplier', 'Target Amount', 'Monthly Income'],
  tableRows: (['lean', 'regular', 'fat', 'coast', 'barista'] as const).map((type) => ({
    label: type[0].toUpperCase() + type.slice(1),
    values: [
      type === 'coast' ? 'discounted seed' : `${{ lean: 60, regular: 100, fat: 150, barista: 50 }[type]}%`,
      formatCurrencyFull(results[type].targetAmount),
      `${formatCurrencyFull(results[type].monthlyPassiveIncome)}/mo`,
    ],
  })),
  factors: [
    'Annual living expenses used as the base for the multiplier',
    'Safe withdrawal rate (SWR) — the percentage drawn from the portfolio each year',
    'Expected annual investment return (nominal)',
    'Expected annual inflation rate, which sets the real (inflation-adjusted) return',
    'Current age and target retirement age',
    'Current net worth and annual savings rate',
    "The FIRE type's fixed expense multiplier (0.5x-1.5x)",
  ],
  stats: [
    {
      text: `${formatPercent(safeWithdrawalRate)} default Safe Withdrawal Rate`,
      ...TRINITY_SOURCE,
    },
    EXPECTED_RETURN_STAT,
  ],
});
