import Link from 'next/link';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';
import { formatCurrencyFull } from '@/lib/utils/format';

/**
 * HowItWorksFire — 부속M K01 on-page editorial depth for the home
 * calculator (fire_timeline). Server component, zero client JS, rendered
 * BELOW the calculator/ResultMonetization block so LCP and the TermsGate
 * overlay are unaffected.
 *
 * All figures below are computed by the SAME calculateFIRE() engine the
 * live calculator uses, fed the SAME DEFAULT_INPUT the calculator starts
 * from (src/constants/fire-defaults.ts) — nothing here is hand-typed or
 * invented. This mirrors the pattern already used on /fire-types
 * (defaultOutput = calculateFIRE(DEFAULT_INPUT)).
 */
export function HowItWorksFire() {
  const output = calculateFIRE(DEFAULT_INPUT);
  const { results } = output;
  const {
    currentAge,
    retirementAge,
    annualIncome,
    annualExpenses,
    savingsRate,
    safeWithdrawalRate,
    expectedReturn,
    inflation,
  } = DEFAULT_INPUT;

  const annualSavings = Math.round(annualIncome * savingsRate);
  const realReturn = (1 + expectedReturn) / (1 + inflation) - 1;

  return (
    <section
      aria-labelledby="how-it-works-heading"
      className="mx-auto max-w-3xl px-4 py-10 space-y-6"
    >
      <div>
        <h2 id="how-it-works-heading" className="text-3xl font-bold mb-3">
          How the FIRE Calculator Works
        </h2>
        <p className="text-muted-foreground">
          FIREPath runs five independent FIRE projections from the same nine
          inputs — current age, retirement age, income, net worth, savings
          rate, expenses, expected return, inflation, and safe withdrawal
          rate (SWR). Every calculation happens{' '}
          <strong>entirely in your browser</strong>; no input is sent to a
          server. Adjust any slider and all five timelines recompute
          instantly.
        </p>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">
        <h3>The core formula</h3>
        <p>
          Four of the five FIRE types (Lean, Regular, Fat, Barista) use the
          same shape of formula — a percentage of your annual expenses,
          divided by your safe withdrawal rate:
        </p>
        <p className="font-mono text-sm bg-muted/50 rounded px-3 py-2">
          FIRE target = (annual expenses × type multiplier) ÷ SWR
        </p>
        <p>
          The multiplier is what makes each type different:{' '}
          <Link href="/fire-types#lean">Lean FIRE</Link> uses{' '}
          {FIRE_MULTIPLIERS.lean} (60% of expenses),{' '}
          <Link href="/fire-types#regular">Regular FIRE</Link> uses{' '}
          {FIRE_MULTIPLIERS.regular.toFixed(1)} (100%),{' '}
          <Link href="/fire-types#fat">Fat FIRE</Link> uses{' '}
          {FIRE_MULTIPLIERS.fat} (150%), and{' '}
          <Link href="/fire-types#barista">Barista FIRE</Link> uses{' '}
          {FIRE_MULTIPLIERS.barista} (50%, since part-time income is assumed
          to cover the rest).{' '}
          <Link href="/fire-types#coast">Coast FIRE</Link> is different: it
          takes the Regular FIRE target and discounts it backward using your
          real (inflation-adjusted) return over the years remaining until
          retirement, so today&apos;s nest egg can grow into that target on
          its own without further contributions.
        </p>
        <p>
          Real return is derived with the Fisher equation —{' '}
          <span className="font-mono">
            (1 + nominal return) ÷ (1 + inflation) − 1
          </span>
          — the standard way to strip inflation out of a nominal investment
          return. Full derivations, formulas, and sources for every figure
          are documented on the{' '}
          <Link href="/methodology">methodology page</Link>.
        </p>

        <h3>Worked example (default scenario)</h3>
        <p>
          Using the calculator&apos;s default inputs — age {currentAge},
          retiring at {retirementAge}, ${annualIncome.toLocaleString('en-US')}/yr
          income, ${annualExpenses.toLocaleString('en-US')}/yr expenses, a{' '}
          {(savingsRate * 100).toFixed(0)}% savings rate,{' '}
          {(expectedReturn * 100).toFixed(0)}% expected nominal return,{' '}
          {(inflation * 100).toFixed(0)}% inflation, and a{' '}
          {(safeWithdrawalRate * 100).toFixed(0)}% SWR — here is exactly how
          the Regular FIRE number is derived:
        </p>
        <ol>
          <li>
            Annual savings = income × savings rate ={' '}
            <span className="font-mono">
              ${annualIncome.toLocaleString('en-US')} × {savingsRate} ={' '}
              {formatCurrencyFull(annualSavings)}/yr
            </span>
            .
          </li>
          <li>
            Regular FIRE target = expenses ÷ SWR ={' '}
            <span className="font-mono">
              ${annualExpenses.toLocaleString('en-US')} ÷ {safeWithdrawalRate} ={' '}
              {formatCurrencyFull(results.regular.targetAmount)}
            </span>
            .
          </li>
          <li>
            Real return = (1 + {expectedReturn}) ÷ (1 + {inflation}) − 1 ={' '}
            <span className="font-mono">{(realReturn * 100).toFixed(2)}%</span>
            .
          </li>
          <li>
            Starting from the default net worth, the calculator grows the
            balance each year at the real (inflation-adjusted) return and
            adds annual savings, until the
            portfolio crosses each FIRE type&apos;s target — that crossing
            year becomes the &quot;reach age&quot; shown on the chart and
            result cards. In this scenario, Regular FIRE is reached at age{' '}
            {results.regular.reachAge ?? '80+'}, with projected monthly
            passive income of{' '}
            {formatCurrencyFull(results.regular.monthlyPassiveIncome)}/mo
            once retired.
          </li>
        </ol>
        <p>
          All five types run this same year-by-year simulation in parallel
          from the same starting point — only the target multiplier (or, for
          Coast, the discounting formula) differs. That is what lets the
          chart plot all five timelines on one graph for direct comparison.
        </p>
      </div>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        Figures on this page are calculated with the same formulas as the
        calculator above, using its default input values. The default assumptions
        (return, inflation, SWR) and their sources are listed on the{' '}
        <Link href="/methodology" className="underline underline-offset-2">
          methodology page
        </Link>
        . Adjust any slider above to see your own numbers.
      </p>
    </section>
  );
}
