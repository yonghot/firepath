import type { Metadata } from 'next';
import Link from 'next/link';
import { Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthorByline } from '@/components/common/author-byline';
import { DisclaimerBanner } from '@/components/common/disclaimer-banner';
import { AdvisorCta } from '@/components/common/advisor-cta';
import { SourcesReferences, type SourceItem } from '@/components/common/sources-references';
import { UpdatedBadge } from '@/components/common/updated-badge';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { buildMeta } from '@/lib/seo';
// safeJsonLd escapes </>/& before this developer-authored (never user-supplied)
// structured-data object is injected — the same pattern already used by
// breadcrumbs.tsx, /guide/[slug], /fire-types, and json-ld.ts across this repo.
import { safeJsonLd } from '@/lib/utils/json-ld';
import { publisherJsonLd } from '@/components/common/json-ld';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { formatCurrencyFull, formatPercent } from '@/lib/utils/format';
import { GUIDE_PUBLISHED, GUIDE_FACTS, GUIDE_SECTIONS, GUIDE_SOURCES } from './content';
import { getPageLastModified } from '@/lib/content-pages';
import { SITE_URL } from '@/lib/site';

const PAGE_PATH = '/fire-guide';
const PAGE_UPDATED = getPageLastModified(PAGE_PATH);
const TITLE = 'The Complete FIRE Guide (2026): 4% Rule, 5 FIRE Types';
const DESCRIPTION =
  "The 4% rule's real 1994 origin, updated 2024-2026 safe-withdrawal-rate research, all 5 FIRE types, sequence-of-returns risk, 2026 IRS and Social Security limits, and the healthcare bridge before Medicare — 14 official sources cited.";

export const metadata: Metadata = buildMeta({
  title: TITLE,
  description: DESCRIPTION,
  path: PAGE_PATH,
  ogType: 'article',
});


const articleJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: 'The Complete FIRE Guide (2026): 5 FIRE Types, the 4% Rule, and Sequence Risk',
  description: DESCRIPTION,
  datePublished: GUIDE_PUBLISHED,
  dateModified: PAGE_UPDATED,
  author: publisherJsonLd(),
  publisher: publisherJsonLd(),
  mainEntityOfPage: `${SITE_URL}${PAGE_PATH}`,
  isAccessibleForFree: true,
};

/**
 * Live-computed savings-rate sensitivity table (부속U §7 — real engine values
 * only, never fabricated). Uses the SAME calculateFIRE() engine every other
 * page on this site draws from, varying only savingsRate against the site's
 * default income/expenses/age/return assumptions, so every number here is a
 * genuine, reproducible calculator output — not an invented statistic.
 */
const SAVINGS_RATES = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6];
const savingsRateRows = SAVINGS_RATES.map((rate) => {
  const output = calculateFIRE({ ...DEFAULT_INPUT, savingsRate: rate });
  const { targetAmount, reachAge, yearsToReach } = output.results.regular;
  return {
    rate,
    annualSavings: DEFAULT_INPUT.annualIncome * rate,
    targetAmount,
    reachAge,
    yearsToReach,
  };
});

function SavingsRateTable() {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm border-collapse">
        <caption className="sr-only">
          Regular FIRE reach age by savings rate, calculated with this calculator&apos;s formulas at
          default age {DEFAULT_INPUT.currentAge}, {formatCurrencyFull(DEFAULT_INPUT.annualIncome)}/yr
          income, and {formatCurrencyFull(DEFAULT_INPUT.annualExpenses)}/yr expenses.
        </caption>
        <thead>
          <tr className="border-b border-border bg-muted/40">
            <th scope="col" className="text-left font-semibold py-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
              Savings Rate
            </th>
            <th scope="col" className="text-left font-semibold py-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
              Annual Savings
            </th>
            <th scope="col" className="text-left font-semibold py-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
              Regular FIRE Reach Age
            </th>
            <th scope="col" className="text-left font-semibold py-2 px-3 text-xs uppercase tracking-wide text-muted-foreground">
              Years From Now
            </th>
          </tr>
        </thead>
        <tbody>
          {savingsRateRows.map((row) => (
            <tr key={row.rate} className="border-b border-border/60">
              <th scope="row" className="text-left font-medium py-2 px-3 tabular-nums">
                {formatPercent(row.rate)}
              </th>
              <td className="py-2 px-3 tabular-nums">{formatCurrencyFull(row.annualSavings)}/yr</td>
              <td className="py-2 px-3 tabular-nums">{row.reachAge !== null ? row.reachAge : '80+'}</td>
              <td className="py-2 px-3 tabular-nums">
                {row.yearsToReach !== null ? `${row.yearsToReach} yrs` : 'not by 80'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="px-3 py-2 text-xs text-muted-foreground border-t border-border">
        Calculated with this calculator&apos;s formulas, holding age ({DEFAULT_INPUT.currentAge}),
        income ({formatCurrencyFull(DEFAULT_INPUT.annualIncome)}/yr), expenses (
        {formatCurrencyFull(DEFAULT_INPUT.annualExpenses)}/yr), and a{' '}
        {formatPercent(DEFAULT_INPUT.expectedReturn)} nominal return constant — only the
        savings rate changes.{' '}
        <Link href="/" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
          Use your own numbers in the calculator
        </Link>
        .
      </p>
    </div>
  );
}

/** Extra internal-link paragraphs spliced in after specific sections (matched by GuideSection.key). */
function SectionLinkout({ sectionKey }: { sectionKey?: string }) {
  switch (sectionKey) {
    case 'fire-types-link':
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Full formulas and worked examples for every type:{' '}
          <Link href="/fire-types" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
            FIRE Types Explained
          </Link>
          .
        </p>
      );
    case 'calc-link':
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          See your own target and reach age for all 5 types at once in the{' '}
          <Link href="/" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
            interactive FIRE calculator
          </Link>
          .
        </p>
      );
    case 'healthcare-link':
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Project your own pre-Medicare coverage cost with the{' '}
          <Link href="/healthcare-bridge" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
            Healthcare Bridge Estimator
          </Link>
          .
        </p>
      );
    case 'methodology-link':
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          Full derivation of every default assumption on this site:{' '}
          <Link href="/methodology" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
            How We Calculate
          </Link>
          .
        </p>
      );
    case 'stats-link':
      return (
        <p className="mt-3 text-sm text-muted-foreground">
          See a ranked, side-by-side comparison of all 5 FIRE-type targets on the{' '}
          <Link href="/fire-statistics" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
            FIRE Statistics
          </Link>{' '}
          page.
        </p>
      );
    default:
      return null;
  }
}

export default function FireGuidePage() {
  const jsonLd = safeJsonLd(articleJsonLd);
  const sources: SourceItem[] = GUIDE_SOURCES.map((s, i) => ({ id: i + 1, label: s.name, url: s.url, note: '' }));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />

      {/* Page header */}
      <div className="border-b border-border bg-muted/20">
        <div className="mx-auto max-w-4xl px-4 py-10 sm:py-14">
          <Breadcrumbs items={[{ name: 'The Complete FIRE Guide', path: PAGE_PATH }]} />
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            The Complete FIRE Guide (2026)
          </h1>
          <UpdatedBadge lastUpdated={PAGE_UPDATED} className="mt-3" />
          <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
            Where the 4% rule actually comes from, all 5 FIRE types, what newer
            withdrawal-rate research says, sequence-of-returns risk, and the 2026
            regulatory numbers — IRS limits, Social Security, healthcare — that
            change every FIRE plan&apos;s math.
          </p>
          <AuthorByline lastUpdated={PAGE_UPDATED} className="mt-3" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Key facts at a glance */}
        <section
          aria-labelledby="key-facts"
          data-quick-answer="true"
          className="rounded-xl border border-primary/20 bg-primary/5 p-4 sm:p-5"
        >
          <h2 id="key-facts" className="text-xs font-medium uppercase tracking-wide text-primary">
            FIRE at a glance (2026)
          </h2>
          <ul className="mt-3 space-y-2 text-sm leading-relaxed">
            {GUIDE_FACTS.map((f) => (
              <li key={f.fact} className="flex gap-2">
                <span aria-hidden="true" className="mt-1 text-primary">
                  &bull;
                </span>
                <span>
                  <strong className="text-foreground">{f.fact}.</strong> {f.detail}{' '}
                  <a
                    href={f.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-2 hover:text-primary/80"
                  >
                    Source
                  </a>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {/* Numbered guide sections */}
        <div className="mt-10 space-y-10">
          {GUIDE_SECTIONS.map((s) => (
            <section key={s.heading} aria-label={s.heading}>
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">{s.heading}</h2>
              <p className="mt-3 text-base leading-relaxed">{s.prose}</p>
              {s.bullets && s.bullets.length > 0 ? (
                <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-muted-foreground">
                  {s.bullets.map((b) => (
                    <li key={b}>{b}</li>
                  ))}
                </ul>
              ) : null}
              {s.key === 'savings-rate' ? <SavingsRateTable /> : null}
              <SectionLinkout sectionKey={s.key} />
            </section>
          ))}
        </div>

        <DisclaimerBanner />

        <div className="mt-8">
          <AdvisorCta />
        </div>

        <SourcesReferences sources={sources} />

        <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
          <h2 className="text-2xl font-semibold mb-2">Run your own FIRE numbers</h2>
          <p className="text-sm text-muted-foreground mb-4">
            See all 5 FIRE types on one interactive timeline, built from your own age,
            income, expenses, and savings rate.
          </p>
          <Link href="/">
            <Button>
              <Calculator className="h-4 w-4 mr-2" />
              Open the Calculator
            </Button>
          </Link>
        </div>
      </div>
    </>
  );
}
