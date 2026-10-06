import type { Metadata } from 'next';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import { AuthorByline } from '@/components/common/author-byline';
import { DisclaimerBanner } from '@/components/common/disclaimer-banner';
import { SourcesReferences, type SourceItem } from '@/components/common/sources-references';
import { UpdatedBadge } from '@/components/common/updated-badge';
import { buildMeta } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { getPageLastModified } from '@/lib/content-pages';
import { CORE_ASSUMPTIONS_AS_OF, SOURCE_CHECKS } from '@/lib/figures';
import { formatIsoDate } from '@/lib/utils/format';

export const metadata: Metadata = buildMeta({
  title: 'How We Calculate: FIRE Formulas and Cited Data Sources',
  description:
    'How FIREPath computes your FIRE numbers: the 4% rule, inflation-adjusted real returns, year-by-year compounding, and the five FIRE-type multipliers.',
  path: '/methodology',
  ogType: 'article',
});

const PAGE_UPDATED = getPageLastModified('/methodology');

/**
 * Verified citations for the Sources & References section.
 * All URLs come from the credibility brief and were confirmed to resolve.
 */
type MethodologySource = SourceItem & { monteCarloOnly?: true };

const METHODOLOGY_SOURCES: MethodologySource[] = [
  {
    id: 1,
    label: 'William Bengen — Wikipedia',
    url: 'https://en.wikipedia.org/wiki/William_Bengen',
    note:
      'Confirms Bengen published the 4% rule in the October 1994 issue of the Journal of Financial Planning and that it was later popularized by the Trinity Study (1998).',
  },
  {
    id: 2,
    label: 'Bankrate — The Revised 4% Rule',
    url: 'https://www.bankrate.com/retirement/revised-4-percent-rule/',
    note: 'Overview of the 4% safe withdrawal rate, its Bengen origin, and current research.',
  },
  {
    id: 3,
    label: 'Retirement Researcher — Safe Withdrawal Rates and the Trinity Study',
    url: 'https://retirementresearcher.com/safe-withdrawal-rates-for-retirement-and-the-trinity-study/',
    note: 'Detailed analysis of Bengen (1994) and the Trinity Study (1998) origins.',
  },
  {
    id: 4,
    label: 'NAPA Net — Morningstar Revises Safe Starting Withdrawal Rate',
    url: 'https://www.napa-net.org/news/2024/12/morningstar-revises-safe-starting-withdrawal-rate/',
    note: 'Trade-press report on Morningstar\'s 2024 revision of its safe starting withdrawal rate.',
  },
  {
    id: 5,
    label: 'Morningstar — Finding Your Safe Withdrawal Rate',
    url: 'https://www.morningstar.com/retirement/morningstars-retirement-income-research-finding-your-safe-withdrawal-rate',
    note: 'Morningstar\'s State of Retirement Income research: 4.0% (2023), 3.7% (2024), 3.9% (2025/2026).',
  },
  {
    id: 6,
    label: 'NYU Stern — Historical Returns on Stocks, Bonds and Bills',
    url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html',
    note: 'Long-run U.S. stock returns. The 7% nominal return default is a FIREPath assumption set below these returns; you can change it.',
  },
  {
    id: 7,
    label: 'J.P. Morgan Asset Management — Long-Term Capital Market Assumptions',
    url: 'https://am.jpmorgan.com/us/en/asset-management/institutional/insights/portfolio-insights/ltcma/',
    note: 'Institutional long-term return assumptions, listed for context.',
  },
  {
    id: 8,
    label: 'U.S. Inflation Calculator — Historical Inflation Rates',
    url: 'https://www.usinflationcalculator.com/inflation/historical-inflation-rates/',
    note: 'Historical U.S. CPI data (basis for the 3% inflation rate default).',
  },
  {
    id: 9,
    label: 'Federal Reserve — Inflation FAQ',
    url: 'https://www.federalreserve.gov/faqs/economy_14400.htm',
    note: 'Fed inflation target context (2% long-run target; 3% default reflects longer-run averages).',
  },
  {
    id: 10,
    label: 'Wikipedia — Fisher Equation',
    url: 'https://en.wikipedia.org/wiki/Fisher_equation',
    note: 'Mathematical basis for the real-return formula: (1 + nominal) / (1 + inflation) − 1.',
  },
  {
    id: 11,
    label: 'Corporate Finance Institute — Fisher Equation',
    url: 'https://corporatefinanceinstitute.com/resources/economics/fisher-equation/',
    note: 'Applied explanation of the Fisher equation for real return calculations.',
  },
  {
    id: 12,
    label: 'Wikipedia — Trinity Study',
    url: 'https://en.wikipedia.org/wiki/Trinity_study',
    note: 'The canonical 25× multiple (target = expenses / 0.04) and 30-year success data.',
  },
  {
    id: 13,
    label: 'White Coat Investor — The 4% Rule',
    url: 'https://www.whitecoatinvestor.com/the-4-rule-safe-withdrawal-rates/',
    note: 'Practical explanation of the FIRE target formula (expenses ÷ SWR).',
  },
  {
    id: 14,
    label: 'T. Rowe Price — How Monte Carlo Analysis Could Improve Your Retirement Plan',
    url: 'https://www.troweprice.com/personal-investing/resources/insights/how-monte-carlo-analysis-could-improve-your-retirement-plan.html',
    note: 'Industry context for Monte Carlo simulations (1,000-run norm for retirement planning).',
    monteCarloOnly: true,
  },
  {
    id: 15,
    label: 'Boldin — Monte Carlo Simulation Methodology',
    url: 'https://help.boldin.com/en/articles/5805671-boldin-s-monte-carlo-simulation',
    note: 'Reference implementation using 1,000 Monte Carlo iterations.',
    monteCarloOnly: true,
  },
  {
    id: 16,
    label: 'YCharts — S&P 500 Monthly Standard Deviation (Annualized)',
    url: 'https://ycharts.com/indices/%5ESPX/monthly_standard_deviation_annualized_all',
    note: 'Historical S&P 500 annualized volatility data (supports 15% volatility assumption).',
    monteCarloOnly: true,
  },
  {
    id: 17,
    label: 'Bankrate — Different Types of FIRE',
    url: 'https://www.bankrate.com/retirement/different-types-of-fire-movement/',
    note: 'Describes Lean, Regular, Fat, Coast, and Barista FIRE definitions.',
  },
  {
    id: 18,
    label: 'ProjectionLab — Coast FIRE',
    url: 'https://projectionlab.com/financial-terms/coast-fire',
    note: 'Coast FIRE definition: amount that compounds to your FIRE target by retirement age.',
  },
  {
    id: 19,
    label: 'Motley Fool — Fat FIRE vs. Coast FIRE vs. Barista FIRE',
    url: 'https://www.fool.com/retirement/2025/02/15/fat-fire-vs-coast-fire-vs-barista-fire-meanings/',
    note: 'Definitions and examples for Fat, Coast, and Barista FIRE variants.',
  },
];

export default function MethodologyPage() {
  const monteCarlo = isPremiumPurchasable();
  const sources: SourceItem[] = METHODOLOGY_SOURCES.filter((source) => monteCarlo || !source.monteCarloOnly).map(
    (source, index) => ({ id: index + 1, label: source.label, url: source.url, note: source.note }),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Breadcrumbs items={[{ name: 'Methodology', path: '/methodology' }]} />

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-4xl font-bold">How We Calculate</h1>
        <UpdatedBadge lastUpdated={PAGE_UPDATED} />
      </div>
      <AuthorByline lastUpdated={PAGE_UPDATED} className="mb-6" />

      <div className="prose prose-neutral dark:prose-invert max-w-none">
        <p>
          FIREPath&apos;s projections are computed entirely in your browser using
          transparent, deterministic formulas — no data leaves your device for the
          calculation. This page documents exactly how each number is produced so
          you can verify and trust the math.
        </p>

        <h2>1. The FIRE number (4% rule / Safe Withdrawal Rate)</h2>
        <p>
          Each FIRE target is your annual expenses divided by your Safe Withdrawal
          Rate (SWR). The default SWR is <strong>4%</strong>, first established by
          financial planner William Bengen in 1994 and later popularized by the{' '}
          <em>Trinity Study</em> (1998), both of which found that withdrawing 4% of
          a portfolio annually (adjusted for inflation) has historically lasted at
          least 30 years. You can adjust the SWR slider (2%–6%) to match your own
          risk tolerance. For example, at a 4% SWR, $40,000 of annual expenses
          implies a $1,000,000 target.
        </p>
        <p className="text-sm text-muted-foreground">
          <strong>Note on current research:</strong> Recent Morningstar analysis
          (2024–2026) puts the safe starting withdrawal rate at approximately 3.7%–3.9%
          for a 30-year, 90%-success horizon — slightly below the traditional 4%.
          Conservative users may prefer the lower end of the SWR slider. The 4% default
          is retained as a widely-recognized benchmark; no default has been changed.
        </p>

        <h2>2. FIRE-type multipliers</h2>
        <p>
          The five FIRE types apply a different multiplier to your current annual
          expenses before dividing by the SWR:
        </p>
        <ul>
          <li><strong>Lean FIRE</strong> — 60% of expenses (minimalist retirement)</li>
          <li><strong>Regular FIRE</strong> — 100% of expenses (current lifestyle)</li>
          <li><strong>Fat FIRE</strong> — 150% of expenses (more comfortable lifestyle)</li>
          <li><strong>Barista FIRE</strong> — 50% of expenses (part-time work covers the rest)</li>
          <li>
            <strong>Coast FIRE</strong> — the amount that, left untouched, compounds
            to your Regular FIRE target by your chosen retirement age (no further
            contributions required)
          </li>
        </ul>

        <h2>3. Inflation-adjusted real return</h2>
        <p>
          Projections use a <em>real</em> (inflation-adjusted) return so all figures
          are in today&apos;s dollars. Given your expected nominal return and
          inflation rate, the real return is:
        </p>
        <p className="font-mono text-sm">
          Real return = (1 + expected return) ÷ (1 + inflation) − 1
        </p>

        <h2>4. Year-by-year compounding</h2>
        <p>
          Starting from your current net worth, each year we add your annual savings
          (annual income × savings rate) and grow the balance by the real return.
          We project from your current age through age 80 and find the first age at
          which your net worth reaches each FIRE target. If a target isn&apos;t
          reached by age 80, the result shows &quot;80+&quot; instead of a date.
        </p>
        <p className="font-mono text-sm">
          Next year&apos;s net worth = this year&apos;s net worth × (1 + real return) + annual savings
        </p>

        <h2>5. Monthly passive income</h2>
        <p>
          For each target we also show the monthly passive income it would generate
          at your SWR: <span className="font-mono text-sm">(target × SWR) / 12</span>.
        </p>

        <h2>6. Default assumptions</h2>
        <p>
          The calculator starts from these values, and every one can be changed with the
          sliders. The last column says whether the default has a source check on record.
        </p>
        <div className="overflow-x-auto">
          <table>
            <caption className="sr-only">Default assumptions, their basis and source checks</caption>
            <thead>
              <tr>
                <th scope="col">Assumption</th>
                <th scope="col">Default</th>
                <th scope="col">Basis</th>
                <th scope="col">Source check</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th scope="row">Safe withdrawal rate</th>
                <td>4%</td>
                <td>Bengen (1994) and the Trinity Study (1998).</td>
                <td>
                  Checked against Morningstar on{' '}
                  <time dateTime={SOURCE_CHECKS['morningstar-finding-swr'].date}>
                    {formatIsoDate(SOURCE_CHECKS['morningstar-finding-swr'].date)}
                  </time>
                  : its latest base case is 3.9% for a 30-year horizon, below the 4% default.
                </td>
              </tr>
              <tr>
                <th scope="row">Expected return (nominal)</th>
                <td>7%</td>
                <td>A FIREPath assumption, set below the long-run U.S. stock returns reported by NYU Stern.</td>
                <td>
                  Checked against NYU Stern on{' '}
                  <time dateTime={SOURCE_CHECKS['nyu-histretsp'].date}>
                    {formatIsoDate(SOURCE_CHECKS['nyu-histretsp'].date)}
                  </time>
                  : long-run U.S. stock returns are higher than 7%.
                </td>
              </tr>
              <tr>
                <th scope="row">Inflation</th>
                <td>3%</td>
                <td>Historical U.S. consumer price data.</td>
                <td>No source check on record.</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={4}>
                  Default values in force as of{' '}
                  <time dateTime={CORE_ASSUMPTIONS_AS_OF}>{formatIsoDate(CORE_ASSUMPTIONS_AS_OF)}</time>.
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="text-sm text-muted-foreground">
          Limitations: projections assume constant returns, inflation, and savings,
          and do not model market volatility{monteCarlo ? ' (use the Monte Carlo simulation for probability ranges)' : ''}, taxes,
          or sequence-of-returns risk. They are
          estimates, not guarantees. (See the <Link href="/">calculator</Link> and
          its FAQ for plain-language explanations.)
        </p>
      </div>

      <SourcesReferences sources={sources} />

      <div className="mt-8">
        <DisclaimerBanner />
      </div>

      <div className="mt-8 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <h2 className="text-2xl font-semibold mb-2">Run your own numbers</h2>
        <p className="text-sm text-muted-foreground mb-4">
          See all five FIRE types on one interactive timeline.
        </p>
        <Link href="/">
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Open the Calculator
          </Button>
        </Link>
      </div>
    </div>
  );
}
