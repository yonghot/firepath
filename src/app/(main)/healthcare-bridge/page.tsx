import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthorByline } from "@/components/common/author-byline";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { AdvisorCta } from "@/components/common/advisor-cta";
import { SourcesReferences, type SourceItem } from "@/components/common/sources-references";
import { HealthcareBridgeCalculator } from "@/components/features/healthcare/healthcare-bridge-calculator";
import { breadcrumbJsonLd } from "@/components/common/json-ld";
import { safeJsonLd } from "@/lib/utils/json-ld";

export const metadata: Metadata = {
  title: "Healthcare Bridge Cost Estimator",
  description:
    "Estimate how much private health insurance will cost from early retirement until Medicare at 65. Informational estimate — enter your own premium; no ACA subsidies fabricated.",
  alternates: { canonical: "/healthcare-bridge" },
  openGraph: {
    title: "Healthcare Bridge Cost Estimator — FIREPath",
    description:
      "Plan the healthcare gap between early retirement and Medicare. Enter your own premium and see the estimated bridge cost.",
    type: "website",
  },
};

const LAST_UPDATED = "2026-06-29";

const SOURCES: SourceItem[] = [
  {
    id: 1,
    label: "Medicare.gov — When Does Medicare Coverage Start?",
    url: "https://www.medicare.gov/basics/get-started-with-medicare/when-does-medicare-coverage-start",
    note: "Official Medicare source confirming eligibility begins at age 65 for most people.",
  },
  {
    id: 2,
    label: "Social Security Act §226 — Entitlement to Hospital Insurance Benefits",
    url: "https://www.ssa.gov/OP_Home/ssact/title18/1836.htm",
    note: "Statutory basis for Medicare eligibility at age 65.",
  },
  {
    id: 3,
    label: "Healthcare.gov — Health Insurance Plans and Prices",
    url: "https://www.healthcare.gov",
    note: "Official ACA marketplace for obtaining real premium quotes based on your income and location.",
  },
  {
    id: 4,
    label: "KFF — 2023 Employer Health Benefits Survey",
    url: "https://www.kff.org/health-costs/report/2023-employer-health-benefits-survey/",
    note: "Historical context for annual premium growth rates; not used to fabricate individual estimates.",
  },
];

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", path: "/" },
  { name: "Healthcare Bridge Estimator", path: "/healthcare-bridge" },
]);

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://gofirepath.com").replace(/\/$/, "");

const toolJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FIREPath Healthcare Bridge Estimator",
  url: `${SITE_URL}/healthcare-bridge`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Informational tool to estimate the cost of bridging private health insurance from early retirement to Medicare eligibility at age 65. User-supplied premiums; no ACA subsidies fabricated.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  publisher: {
    "@type": "Organization",
    name: "FIREPath",
    url: SITE_URL,
  },
};

export default function HealthcareBridgePage() {
  // safeJsonLd escapes </> characters. Content is developer-authored structured data,
  // not user-supplied — safe for script injection into JSON-LD blocks (same pattern
  // used across /methodology, /guide, and home page in this codebase).
  const breadcrumbJson = safeJsonLd(breadcrumb);
  const toolJson = safeJsonLd(toolJsonLd);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJson }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: toolJson }} />

      <div>
        <div className="flex items-center gap-2 mb-2">
          <HeartPulse className="h-6 w-6 text-[var(--brand-primary)]" aria-hidden="true" />
          <h1 className="text-4xl font-bold">Healthcare Bridge Estimator</h1>
        </div>
        <AuthorByline lastUpdated={LAST_UPDATED} className="mb-4" />
        <p className="text-muted-foreground">
          One of the biggest hidden costs in early retirement is health insurance. If you retire
          before 65, you need private coverage until Medicare kicks in. This tool helps you estimate
          that bridge cost using <strong>your own premium figures</strong> — we never fabricate
          subsidy amounts.
        </p>
      </div>

      <section aria-labelledby="calculator-heading">
        <h2 id="calculator-heading" className="text-2xl font-semibold mb-4">
          Estimate your bridge cost
        </h2>
        <HealthcareBridgeCalculator />
      </section>

      <section
        aria-labelledby="how-it-works-heading"
        className="prose prose-neutral dark:prose-invert max-w-none"
      >
        <h2 id="how-it-works-heading">How the estimate works</h2>
        <p>
          Medicare eligibility in the United States begins at age 65, as set by the{" "}
          <a
            href="https://www.ssa.gov/OP_Home/ssact/title18/1836.htm"
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
          totalCost = premium × ((1 + growthRate)^bridgeYears − 1) / growthRate
        </p>
        <p>
          When no growth rate is provided (or it is 0%), the formula simplifies to{" "}
          <span className="font-mono text-sm">premium × bridgeYears</span>.
        </p>
        <p>All computation happens entirely in your browser — no data is sent to a server.</p>

        <h2>What this tool does NOT do</h2>
        <ul>
          <li>
            <strong>No ACA subsidy calculations.</strong> Subsidy amounts depend on your Modified
            Adjusted Gross Income, household size, plan tier, and state. Any tool that generates a
            subsidy from age and income alone is fabricating a figure. We do not fabricate. Get
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
          href="https://www.ssa.gov/OP_Home/ssact/title18/1836.htm"
          target="_blank"
          rel="noopener noreferrer"
          className="underline underline-offset-2"
        >
          Social Security Act §226
        </a>
        . No government-benefit amounts are synthesized or implied.
      </p>

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
