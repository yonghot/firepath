import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthorByline } from "@/components/common/author-byline";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { AdvisorCta } from "@/components/common/advisor-cta";
import { SourcesReferences, type SourceItem } from "@/components/common/sources-references";
import { HealthcareBridgeCalculator } from "@/components/features/healthcare/healthcare-bridge-calculator";
import { FAQSection, type FaqItem } from "@/components/common/faq-section";
import { publisherJsonLd } from "@/components/common/json-ld";
import { safeJsonLd } from "@/lib/utils/json-ld";
import { buildMeta } from "@/lib/seo";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { NextStep } from "@/components/common/next-step";
import { healthcareNextSteps } from "@/lib/next-steps";
import { calculateHealthcareBridge, MEDICARE_ELIGIBILITY_AGE } from "@/lib/engine/healthcare-bridge";
import { formatCurrencyFull } from "@/lib/utils/format";
import { AnswerBlock } from "@/components/common/answer-block";
import { buildAnswerBlock, type GeoAnswerEntity } from "@/lib/seo/geo";
import { getPageLastModified } from "@/lib/content-pages";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = buildMeta({
  title: "Healthcare Bridge Estimator: Your Cost Before Medicare",
  description:
    "Estimate private health insurance cost from early retirement to Medicare at 65. Enter your own premium; ACA subsidies are not estimated.",
  path: "/healthcare-bridge",
});

const PAGE_UPDATED = getPageLastModified("/healthcare-bridge");

const SOURCES: SourceItem[] = [
  {
    id: 1,
    label: "Medicare.gov — When Does Medicare Coverage Start?",
    url: "https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start",
    note: "Official Medicare source: you can generally sign up when you turn 65.",
  },
  {
    id: 2,
    label: "Social Security Act §226 (42 U.S.C. §426) — Entitlement to Hospital Insurance Benefits",
    url: "https://www.govinfo.gov/content/pkg/USCODE-2023-title42/html/USCODE-2023-title42-chap7-subchapII-sec426.htm",
    note: "Statutory basis for Medicare hospital insurance at age 65 (U.S. Code text from the Government Publishing Office).",
  },
  {
    id: 3,
    label: "Healthcare.gov — Health Insurance Plans and Prices",
    url: "https://www.healthcare.gov",
    note: "Official ACA marketplace for obtaining real premium quotes based on your income and location.",
  },
  {
    id: 4,
    label: "KFF — 2025 Employer Health Benefits Survey",
    url: "https://www.kff.org/health-costs/2025-employer-health-benefits-survey/",
    note: "Context on employer health plan premiums. It does not measure the individual plans an early retiree buys, and the 5% growth used here is an adjustable assumption, not a KFF figure.",
  },
];

/**
 * Worked example (부속M K01) — uses the SAME default values the
 * HealthcareBridgeCalculator form pre-fills (see DEFAULT_FORM in
 * healthcare-bridge-calculator.tsx: age 35, retire 50, $7,200/yr premium,
 * 5% growth), run through the identical calculateHealthcareBridge() engine
 * the live tool calls. Nothing here is a separately hand-typed figure.
 */
const EXAMPLE_INPUT = {
  currentAge: 35,
  retirementAge: 50,
  annualPremium: 7200,
  annualGrowthRate: 0.05,
};
const exampleComputed = calculateHealthcareBridge(EXAMPLE_INPUT);
const exampleResult = exampleComputed.ok ? exampleComputed.result : null;

/**
 * 부속P CODE-01 — GEO answer block scenarios. Same $7,200/yr example premium
 * and 5% growth rate as EXAMPLE_INPUT/exampleResult above, run through the
 * SAME calculateHealthcareBridge() engine at five different retirement ages
 * so the table shows real per-scenario totals, not template substitution.
 */
const BRIDGE_SCENARIO_AGES = [45, 50, 55, 60, 64] as const;
const bridgeScenarios = BRIDGE_SCENARIO_AGES.map((retirementAge) => {
  const computed = calculateHealthcareBridge({
    currentAge: EXAMPLE_INPUT.currentAge,
    retirementAge,
    annualPremium: EXAMPLE_INPUT.annualPremium,
    annualGrowthRate: EXAMPLE_INPUT.annualGrowthRate,
  });
  return { retirementAge, result: computed.ok ? computed.result : null };
});

const HEALTHCARE_BRIDGE_ANSWER: GeoAnswerEntity | null = exampleResult
  ? buildAnswerBlock({
      query: "How much do you need to retire early with a healthcare bridge before Medicare?",
      answer:
        `At a $${EXAMPLE_INPUT.annualPremium.toLocaleString('en-US')}/yr premium with ${(EXAMPLE_INPUT.annualGrowthRate * 100).toFixed(0)}% ` +
        `annual growth, retiring at ${EXAMPLE_INPUT.retirementAge} means ${exampleResult.bridgeYears} bridge years and ` +
        `${formatCurrencyFull(exampleResult.totalEstimatedCost)} total before Medicare at ${MEDICARE_ELIGIBILITY_AGE}. ` +
        `As of ${PAGE_UPDATED}, later retirement ages shorten the bridge and lower the total — retiring at 64 needs just 1 year of coverage.`,
      lastUpdated: PAGE_UPDATED,
      tableHeaders: ["Retirement Age", "Bridge Years", "Total Estimated Cost", "Medicare At"],
      tableRows: bridgeScenarios
        .filter((s) => s.result)
        .map((s) => ({
          label: `Retire at ${s.retirementAge}`,
          values: [
            `${s.result!.bridgeYears} yrs`,
            formatCurrencyFull(s.result!.totalEstimatedCost),
            `${MEDICARE_ELIGIBILITY_AGE}`,
          ],
        })),
      factors: [
        "Your annual health insurance premium (you enter it; the tool does not estimate one)",
        "Annual premium growth rate — an adjustable assumption (the worked example uses 5%/yr; premiums are not guaranteed to follow it)",
        "Number of bridge years between your retirement age and Medicare eligibility at 65",
        "Whether you have access to COBRA continuation coverage (18-36 months, employer-specific)",
        "ACA marketplace subsidy eligibility, which depends on income and household size (not modeled here)",
        "State of residence, which affects marketplace plan pricing",
      ],
      stats: [
        {
          text: `Medicare eligibility begins at age ${MEDICARE_ELIGIBILITY_AGE}`,
          sourceLabel: "Social Security Act §226",
          sourceUrl: "https://www.govinfo.gov/content/pkg/USCODE-2023-title42/html/USCODE-2023-title42-chap7-subchapII-sec426.htm",
        },
        {
          text: "5%/yr premium growth in the worked example (an adjustable assumption, not a published figure)",
          sourceLabel: "KFF 2025 Employer Health Benefits Survey (context on employer premiums)",
          sourceUrl: "https://www.kff.org/health-costs/2025-employer-health-benefits-survey/",
        },
      ],
    })
  : null;

const HEALTHCARE_BRIDGE_FAQ: FaqItem[] = [
  {
    q: "At what age does Medicare start?",
    a: `Medicare eligibility begins at age ${MEDICARE_ELIGIBILITY_AGE} for most people, under the Social Security Act §226. If your planned retirement age is ${MEDICARE_ELIGIBILITY_AGE} or later, this tool shows "no healthcare bridge needed" — you can rely on Medicare from day one of retirement.`,
  },
  {
    q: "Does this tool calculate my ACA subsidy?",
    a: "No. ACA subsidies depend on your Modified Adjusted Gross Income, household size, plan tier, and state, so a figure guessed from age and income alone would not be reliable. Get a real subsidy quote at healthcare.gov.",
  },
  {
    q: "What premium number should I enter?",
    a: exampleResult
      ? `Use a real quote from healthcare.gov, your COBRA notice, or a current private plan — not a guess. In the worked example above, a $${EXAMPLE_INPUT.annualPremium.toLocaleString('en-US')}/yr premium at age ${EXAMPLE_INPUT.currentAge} retiring at ${EXAMPLE_INPUT.retirementAge} produces a ${exampleResult.bridgeYears}-year bridge totaling ${formatCurrencyFull(exampleResult.totalEstimatedCost)} — swap in your own premium to get your own total.`
      : "Use a real quote from healthcare.gov, your COBRA notice, or a current private plan — not a guess.",
  },
  {
    q: "Why does the estimate include a growth rate?",
    a: "Health insurance premiums tend to rise over time, but how fast depends on your plan, age and state. The growth rate is an adjustable assumption: the worked example uses 5%/yr, which is not a published statistic, and you can enter your own. Adding a growth rate compounds your premium forward year by year using a geometric series, instead of assuming a flat cost for every bridge year, which would understate the total for longer bridges.",
  },
  {
    q: "What if I plan to retire after 65?",
    a: `Then you don't need this calculator at all — Medicare eligibility starts at ${MEDICARE_ELIGIBILITY_AGE}, so there's no private-insurance bridge period. Entering a retirement age of ${MEDICARE_ELIGIBILITY_AGE} or higher returns "no healthcare bridge needed."`,
  },
];


const toolJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FIREPath Healthcare Bridge Estimator",
  url: `${SITE_URL}/healthcare-bridge`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Informational tool to estimate the cost of bridging private health insurance from early retirement to Medicare eligibility at age 65. User-supplied premiums; ACA subsidies are not estimated.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: publisherJsonLd(),
};

export default function HealthcareBridgePage() {
  // safeJsonLd escapes </> characters. Content is developer-authored structured data,
  // not user-supplied — safe for script injection into JSON-LD blocks (same pattern
  // used across /methodology, /guide, and home page in this codebase). 부속P
  // CODE-02: FAQPage JSON-LD is no longer emitted (deprecated for SERP display
  // in 2026) — the FAQSection below still renders the same Q&A as on-page text.
  const toolJson = safeJsonLd(toolJsonLd);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toolJson }} />

      <Breadcrumbs items={[{ name: "Healthcare Bridge Estimator", path: "/healthcare-bridge" }]} />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <HeartPulse className="h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
          <h1 className="text-4xl font-bold">Healthcare Bridge Estimator</h1>
        </div>
        <AuthorByline lastUpdated={PAGE_UPDATED} className="mb-4" />
        <p className="text-muted-foreground">
          One of the biggest hidden costs in early retirement is health insurance. If you retire
          before 65, you need private coverage until Medicare kicks in. This tool helps you estimate
          that bridge cost using <strong>your own premium figures</strong>. It does not estimate
          ACA subsidies.
        </p>
      </div>

      {/* 부속P CODE-01 — GEO answer block, FIRST content block after the
          header/breadcrumb chrome: query-phrased H2, 40-60 word answer,
          data table of real per-retirement-age scenarios, factor list, and
          >=2 sourced stats — server-rendered. Absent only if the example
          computation somehow errors (defensive; not expected at build time). */}
      {HEALTHCARE_BRIDGE_ANSWER && (
        <AnswerBlock entity={HEALTHCARE_BRIDGE_ANSWER} idPrefix="healthcare-bridge-geo" />
      )}

      <section aria-labelledby="calculator-heading">
        <h2 id="calculator-heading" className="text-2xl font-semibold mb-4">
          Estimate your bridge cost
        </h2>
        <HealthcareBridgeCalculator />
      </section>

      <NextStep items={healthcareNextSteps()} />

      <section
        aria-labelledby="how-it-works-heading"
        className="prose prose-neutral dark:prose-invert max-w-none"
      >
        <h2 id="how-it-works-heading">How the estimate works</h2>
        <p>
          Medicare eligibility in the United States begins at age 65, as set by the{" "}
          <a
            href="https://www.govinfo.gov/content/pkg/USCODE-2023-title42/html/USCODE-2023-title42-chap7-subchapII-sec426.htm"
            target="_blank"
            rel="noopener noreferrer"
          >
            Social Security Act §226
          </a>
          . If you retire earlier, you need private coverage for every year between your
          early-retirement date and 65.
        </p>
        <p>
          The calculation is straightforward: multiply your annual premium by the number of bridge
          years. If you supply a growth rate, the tool applies a geometric series to account for
          compounding annual increases:
        </p>
        <p className="font-mono text-sm">
          Total cost = premium × ((1 + growth rate)^(bridge years) − 1) ÷ growth rate
        </p>
        <p>
          When no growth rate is provided (or it is 0%), the formula simplifies to{" "}
          <span className="font-mono text-sm">premium × bridge years</span>.
        </p>
        <p>All computation happens entirely in your browser — no data is sent to a server.</p>

        <h3>Worked example</h3>
        {exampleResult && !exampleResult.noGapNeeded ? (
          <>
            <p>
              Say you&apos;re {EXAMPLE_INPUT.currentAge} years old, planning to retire early at{" "}
              {EXAMPLE_INPUT.retirementAge}, with a real quote of{" "}
              ${EXAMPLE_INPUT.annualPremium.toLocaleString('en-US')}/yr for private coverage and an
              assumed {(EXAMPLE_INPUT.annualGrowthRate * 100).toFixed(0)}% annual premium growth
              rate (an adjustable assumption, not a published statistic). Here is the exact
              calculation:
            </p>
            <ol>
              <li>
                Bridge years = {MEDICARE_ELIGIBILITY_AGE} − {EXAMPLE_INPUT.retirementAge} ={" "}
                <span className="font-mono text-sm">{exampleResult.bridgeYears} years</span> of
                private coverage needed before Medicare.
              </li>
              <li>
                Since the growth rate is non-zero, the tool applies the geometric series:{" "}
                <span className="font-mono text-sm">
                  ${EXAMPLE_INPUT.annualPremium.toLocaleString('en-US')} × ((1.05)^
                  {exampleResult.bridgeYears} − 1) / 0.05
                </span>
                .
              </li>
              <li>
                Total estimated bridge cost ={" "}
                <span className="font-mono text-sm">
                  {formatCurrencyFull(exampleResult.totalEstimatedCost)}
                </span>{" "}
                across all {exampleResult.bridgeYears} years — this is the number the result
                cards above would show for these exact inputs.
              </li>
            </ol>
            <p>
              That total is about{" "}
              {(
                exampleResult.totalEstimatedCost /
                (EXAMPLE_INPUT.annualPremium * exampleResult.bridgeYears)
              ).toFixed(2)}
              × the naive flat estimate ($
              {(EXAMPLE_INPUT.annualPremium * exampleResult.bridgeYears).toLocaleString('en-US')}) you&apos;d
              get by ignoring premium growth — which is why the growth-rate field matters for
              longer bridges.
            </p>
          </>
        ) : null}

        <h2>What this tool does NOT do</h2>
        <ul>
          <li>
            <strong>No ACA subsidy calculations.</strong> Subsidy amounts depend on your Modified
            Adjusted Gross Income, household size, plan tier, and state. A figure generated from
            age and income alone would be a guess, so this tool does not produce one. Get
            real quotes at{" "}
            <a href="https://www.healthcare.gov" target="_blank" rel="noopener noreferrer">
              healthcare.gov
            </a>
            .
          </li>
          <li>
            <strong>No COBRA cost modeling.</strong> COBRA is a short-term option (up to 18–36
            months) with amounts specific to your employer plan.
          </li>
          <li>
            <strong>No HSA strategy modeling.</strong> Health Savings Accounts can offset premium
            costs, but the right strategy depends on your individual tax situation.
          </li>
        </ul>
      </section>

      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        <strong>Methodology note:</strong> Bridge-years formula uses the publicly defined Medicare
        eligibility age (65) per{" "}
        <a
          href="https://www.govinfo.gov/content/pkg/USCODE-2023-title42/html/USCODE-2023-title42-chap7-subchapII-sec426.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Social Security Act §226
        </a>
        . No government-benefit amounts are synthesized or implied.
      </p>

      {/* 부속M K01 — entity-level FAQ citing this tool's own worked-example
          figures (see HEALTHCARE_BRIDGE_FAQ above). */}
      <FAQSection
        items={HEALTHCARE_BRIDGE_FAQ}
        title="Healthcare Bridge FAQ"
        idPrefix="healthcare-bridge-faq"
        className="pt-2"
      />

      <DisclaimerBanner />

      <AdvisorCta />

      <SourcesReferences sources={SOURCES} />

      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <h2 className="text-2xl font-semibold mb-2">Factor healthcare into your FIRE number</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use the main calculator to see all 5 FIRE types on one interactive timeline.
        </p>
        <Link href="/">
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Open the FIRE Calculator
          </Button>
        </Link>
      </div>
    </div>
  );
}
