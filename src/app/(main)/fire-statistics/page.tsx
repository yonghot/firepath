import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthorByline } from "@/components/common/author-byline";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { SourcesReferences, type SourceItem } from "@/components/common/sources-references";
import { safeJsonLd } from "@/lib/utils/json-ld";
import { buildMeta } from "@/lib/seo";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { fireStatisticsDatasetJsonLd } from "@/components/common/json-ld";
import { buildFireStatisticsDataset, STATISTICS_RETIREMENT_AGE_SCENARIOS } from "@/lib/seo/statistics";
import { formatCurrencyFull, formatIsoDate } from "@/lib/utils/format";
import { buildSynthesisSentence } from "@/lib/content-pages";

/**
 * /fire-statistics — 부속P CODE-04 "linkable asset" statistics page.
 *
 * Digital-PR / data-storytelling ammunition + prime AI-citation target: a
 * headline stat, a ranked table across all 5 FIRE types, a cross-scenario
 * comparison table (5 retirement-age scenarios), and 3-5 pull-quote-ready
 * findings — every figure computed live via calculateFIRE() (see
 * src/lib/seo/statistics.ts buildFireStatisticsDataset()), never fabricated.
 * The same dataset backs the downloadable /data.json and /data.csv feeds
 * (src/app/data.json/route.ts, src/app/data.csv/route.ts) and the Dataset
 * JSON-LD emitted below.
 *
 * The Dataset JSON-LD below is developer-authored (not user-supplied) data,
 * passed through safeJsonLd() (which escapes </>/&) before injection into a
 * <script type="application/ld+json"> tag — the same pattern already used
 * sitewide (see json-ld.ts header comment, fire-types/page.tsx, etc.).
 */

export const metadata: Metadata = buildMeta({
  title: "FIRE Target Scenarios: Amounts by Type and Retirement Age",
  description:
    "Calculated FIRE target amounts at default inputs, ranked by FIRE type and compared across retirement ages. Scenario figures, not survey data, with JSON and CSV downloads.",
  path: "/fire-statistics",
  ogType: "article",
});

const dataset = buildFireStatisticsDataset();

/**
 * 부속P CODE-06 — data-derived synthesis sentence with conditional phrasing
 * (only asserts "above"/"below" when the numbers actually support it —
 * built via buildSynthesisSentence()/aboveOrBelowBenchmark() in
 * src/lib/content-pages.ts, never a hardcoded direction).
 */
const leanRow = dataset.rankedFireTypes.find((r) => r.type === "lean")!;
const regularRow = dataset.rankedFireTypes.find((r) => r.type === "regular")!;
const SYNTHESIS_SENTENCE = buildSynthesisSentence({
  entityLabel: "Lean FIRE",
  value: leanRow.targetAmount,
  formattedValue: formatCurrencyFull(leanRow.targetAmount),
  benchmarkLabel: "the Regular FIRE target",
  benchmark: regularRow.targetAmount,
  formattedBenchmark: formatCurrencyFull(regularRow.targetAmount),
});

const SOURCES: SourceItem[] = dataset.sources.map((s, i) => ({
  id: i + 1,
  label: s.label,
  url: s.url,
  note: "Underlying assumption described on the methodology page.",
}));

export default function FireStatisticsPage() {
  const datasetJson = safeJsonLd(
    fireStatisticsDatasetJsonLd({
      dateModified: dataset.lastUpdated,
      description: dataset.headline.text,
    })
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: datasetJson }} />

      <Breadcrumbs items={[{ name: "FIRE Target Scenarios", path: "/fire-statistics" }]} />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <BarChart3 className="h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
          <h1 className="text-4xl font-bold">FIRE Target Scenarios</h1>
        </div>
        <AuthorByline lastUpdated={dataset.lastUpdated} className="mb-4" />
        <p className="text-muted-foreground">
          Target amounts for each FIRE type at the default inputs, ranked and compared across
          retirement ages. Every figure is calculated with the same formulas as the interactive
          calculator, so these are calculated scenarios, not survey data.
        </p>
      </div>

      {/* Headline stat */}
      <section
        aria-labelledby="headline-stat-heading"
        className="rounded-xl border bg-card p-6 space-y-3"
      >
        <h2 id="headline-stat-heading" className="text-2xl font-bold">
          Headline figure
        </h2>
        <p className="text-3xl font-bold tabular-nums text-[var(--brand-primary)]">
          {dataset.headline.value}
        </p>
        <p className="text-base leading-relaxed">{dataset.headline.text}</p>
        <p className="text-xs text-muted-foreground">
          Updated{" "}
          <time dateTime={dataset.lastUpdated} className="font-medium text-foreground">
            {formatIsoDate(dataset.lastUpdated)}
          </time>
          .
        </p>
      </section>

      {/* Ranked table */}
      <section aria-labelledby="ranked-table-heading" className="space-y-3">
        <h2 id="ranked-table-heading" className="text-2xl font-bold">
          FIRE targets ranked (highest to lowest)
        </h2>
        <p className="text-sm text-muted-foreground">{SYNTHESIS_SENTENCE}</p>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">
              FIRE targets ranked highest to lowest at default inputs
            </caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Rank
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  FIRE Type
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Multiplier
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Target Amount
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Monthly Income
                </th>
              </tr>
            </thead>
            <tbody>
              {dataset.rankedFireTypes.map((row, i) => (
                <tr key={row.type} className="border-b border-border/60">
                  <td className="py-2 px-4 tabular-nums">{i + 1}</td>
                  <th scope="row" className="text-left font-medium py-2 px-4">
                    {row.type === "coast" ? `${row.label} (seed needed today)` : row.label}
                  </th>
                  <td className="py-2 px-4 tabular-nums">
                    {row.multiplier === "discounted seed" ? "discounted seed" : `${(row.multiplier * 100).toFixed(0)}%`}
                  </td>
                  <td className="py-2 px-4 tabular-nums font-medium">{formatCurrencyFull(row.targetAmount)}</td>
                  <td className="py-2 px-4 tabular-nums">{formatCurrencyFull(row.monthlyPassiveIncome)}/mo{row.type === "coast" ? " at retirement" : ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Cross-scenario comparison */}
      <section aria-labelledby="scenario-table-heading" className="space-y-3">
        <h2 id="scenario-table-heading" className="text-2xl font-bold">
          FIRE targets by retirement age
        </h2>
        <p className="text-sm text-muted-foreground">
          Cross-scenario comparison across {STATISTICS_RETIREMENT_AGE_SCENARIOS.length} retirement
          ages, holding all other inputs at their defaults. {dataset.retirementAgeNote}
        </p>
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm border-collapse">
            <caption className="sr-only">FIRE targets across 5 retirement-age scenarios</caption>
            <thead>
              <tr className="border-b border-border">
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Retire At
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Lean
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Regular
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Fat
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Coast (seed today)
                </th>
                <th scope="col" className="text-left font-semibold py-2 px-4 text-xs uppercase tracking-wide text-muted-foreground">
                  Barista
                </th>
              </tr>
            </thead>
            <tbody>
              {dataset.scenarios.map((row) => (
                <tr key={row.retirementAge} className="border-b border-border/60">
                  <th scope="row" className="text-left font-medium py-2 px-4 tabular-nums">
                    Age {row.retirementAge}
                  </th>
                  <td className="py-2 px-4 tabular-nums">{formatCurrencyFull(row.targets.lean)}</td>
                  <td className="py-2 px-4 tabular-nums">{formatCurrencyFull(row.targets.regular)}</td>
                  <td className="py-2 px-4 tabular-nums">{formatCurrencyFull(row.targets.fat)}</td>
                  <td className="py-2 px-4 tabular-nums">{formatCurrencyFull(row.targets.coast)}</td>
                  <td className="py-2 px-4 tabular-nums">{formatCurrencyFull(row.targets.barista)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Quotable findings */}
      <section aria-labelledby="findings-heading" className="space-y-3">
        <h2 id="findings-heading" className="text-2xl font-bold">
          What the scenarios show
        </h2>
        <ul className="space-y-3">
          {dataset.findings.map((finding, i) => (
            <li key={i} className="rounded-xl border bg-card p-4 text-sm leading-relaxed">
              {finding}
            </li>
          ))}
        </ul>
      </section>

      {/* Downloadable data */}
      <section aria-labelledby="downloads-heading" className="rounded-xl border bg-card p-6 space-y-3">
        <h2 id="downloads-heading" className="text-xl font-semibold">
          Download the data
        </h2>
        <p className="text-sm text-muted-foreground">
          The exact figures above, in machine-readable form — same dataset, no additional
          processing. Free to reuse under{" "}
          <a
            href="https://creativecommons.org/licenses/by/4.0/"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            CC BY 4.0
          </a>{" "}
          with credit to FIREPath.
        </p>
        <div className="flex flex-wrap gap-3">
          <a
            href="/data.json"
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium underline underline-offset-2 hover:shadow-md transition-shadow duration-150"
          >
            data.json
          </a>
          <a
            href="/data.csv"
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-medium underline underline-offset-2 hover:shadow-md transition-shadow duration-150"
          >
            data.csv
          </a>
        </div>
      </section>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        <strong>Methodology note:</strong> All figures are calculated with the same formulas as
        the calculator, documented on{" "}
        <Link href="/methodology" className="underline underline-offset-2">
          the methodology page
        </Link>
        . They are scenario figures at default inputs, not survey data.
      </p>

      <DisclaimerBanner />

      <SourcesReferences sources={SOURCES} />

      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <h2 className="text-2xl font-semibold mb-2">See your own numbers</h2>
        <p className="text-sm text-muted-foreground mb-4">
          These scenarios use default inputs — plug in your own to see your personal FIRE targets.
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
