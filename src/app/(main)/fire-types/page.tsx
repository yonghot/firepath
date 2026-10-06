import type { Metadata } from "next";
import Link from "next/link";
import { Calculator, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AuthorByline } from "@/components/common/author-byline";
import { DisclaimerBanner } from "@/components/common/disclaimer-banner";
import { AdvisorCta } from "@/components/common/advisor-cta";
import { SourcesReferences, type SourceItem } from "@/components/common/sources-references";
import { FAQSection, type FaqItem } from "@/components/common/faq-section";
import { safeJsonLd } from "@/lib/utils/json-ld";
import { calculateFIRE } from "@/lib/engine/fire-calculator";
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from "@/constants/fire-defaults";
import { FIRE_COLORS, FIRE_LABELS } from "@/constants/fire-colors";
import { formatCurrencyFull, formatPercent } from "@/lib/utils/format";
import { buildMeta } from "@/lib/seo";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { AnswerBlock } from "@/components/common/answer-block";
import { buildAnswerBlock, type GeoAnswerEntity } from "@/lib/seo/geo";
import { CORE_ASSUMPTIONS_LAST_VERIFIED } from "@/lib/figures";

export const metadata: Metadata = buildMeta({
  title: "FIRE Types Explained: Lean, Fat, Coast and Barista",
  description:
    "Understand all 5 FIRE types — Lean, Regular, Fat, Coast, Barista — with real formulas, worked examples, and computed targets from the FIREPath engine.",
  path: "/fire-types",
  ogType: "article",
});

const LAST_UPDATED = "2026-06-29";

/** Computed from default inputs so all figures on this page are real engine outputs. */
const defaultOutput = calculateFIRE(DEFAULT_INPUT);
const defaultResults = defaultOutput.results;
const { annualExpenses, safeWithdrawalRate, currentAge, retirementAge } = DEFAULT_INPUT;

/**
 * 부속P CODE-01 — GEO answer block, the FIRST content block on this page.
 * Query-phrased H2 + 40-60 word answer paragraph + data table + factor list
 * + >=2 source-attributed stats, all built from the SAME defaultResults
 * engine output the rest of this page (and its FAQ/cards) already uses.
 */
const FIRE_TYPES_ANSWER: GeoAnswerEntity = buildAnswerBlock({
  query: "How much do you need to retire early with each FIRE type?",
  answer:
    `At the common defaults (age ${currentAge}, $${annualExpenses.toLocaleString()}/yr expenses, ` +
    `${formatPercent(safeWithdrawalRate)} SWR), Lean FIRE needs ${fmtShort(defaultResults.lean.targetAmount)}, ` +
    `Regular FIRE needs ${fmtShort(defaultResults.regular.targetAmount)}, Fat FIRE needs ` +
    `${fmtShort(defaultResults.fat.targetAmount)}, Coast FIRE needs a ${fmtShort(defaultResults.coast.targetAmount)} seed today, ` +
    `and Barista FIRE needs ${fmtShort(defaultResults.barista.targetAmount)}. As of ${CORE_ASSUMPTIONS_LAST_VERIFIED}, each target is annual expenses times a fixed multiplier, divided by the SWR.`,
  dataVerifiedDate: CORE_ASSUMPTIONS_LAST_VERIFIED,
  tableHeaders: ["FIRE Type", "Multiplier", "Target Amount", "Monthly Income"],
  tableRows: (["lean", "regular", "fat", "coast", "barista"] as const).map((type) => ({
    label: FIRE_LABELS[type],
    values: [
      type === "coast" ? "discounted seed" : `${(FIRE_MULTIPLIERS[type] * 100).toFixed(0)}%`,
      formatCurrencyFull(defaultResults[type].targetAmount),
      `${formatCurrencyFull(defaultResults[type].monthlyPassiveIncome)}/mo`,
    ],
  })),
  factors: [
    "Annual living expenses used as the base for the multiplier",
    "Safe withdrawal rate (SWR) — the percentage drawn from the portfolio each year",
    "Expected annual investment return (nominal)",
    "Expected annual inflation rate, which sets the real (inflation-adjusted) return",
    "Current age and target retirement age, which set the Coast FIRE discount period",
    "The FIRE type's fixed expense multiplier (0.5x-1.5x)",
    "Current net worth and annual savings rate, which drive how fast the timeline reaches each target",
  ],
  stats: [
    {
      text: `${formatPercent(safeWithdrawalRate)} default Safe Withdrawal Rate`,
      sourceLabel: "Trinity Study (1998)",
      sourceUrl: "https://en.wikipedia.org/wiki/Trinity_study",
    },
    {
      text: "7% default nominal expected return",
      sourceLabel: "NYU Stern historical U.S. equity return data",
      sourceUrl: "https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html",
    },
  ],
});

/** Format a dollar amount as a short label for the answer paragraph (e.g. "$625K"). */
function fmtShort(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

/** Helper: format a dollar amount for body text */
function fmt(n: number) {
  return formatCurrencyFull(n);
}

const SOURCES: SourceItem[] = [
  {
    id: 1,
    label: "Bankrate — Different Types of FIRE",
    url: "https://www.bankrate.com/retirement/different-types-of-fire-movement/",
    note: "Describes Lean, Regular, Fat, Coast, and Barista FIRE definitions.",
  },
  {
    id: 2,
    label: "Wikipedia — Trinity Study",
    url: "https://en.wikipedia.org/wiki/Trinity_study",
    note: "Source of the 4% rule: target = annual expenses ÷ SWR; 25× rule at 4% SWR.",
  },
  {
    id: 3,
    label: "ProjectionLab — Coast FIRE",
    url: "https://projectionlab.com/financial-terms/coast-fire",
    note: "Coast FIRE definition: amount that compounds to your FIRE target by retirement age.",
  },
  {
    id: 4,
    label: "Motley Fool — Fat FIRE vs. Coast FIRE vs. Barista FIRE",
    url: "https://www.fool.com/retirement/2025/02/15/fat-fire-vs-coast-fire-vs-barista-fire-meanings/",
    note: "Worked definitions and examples for Fat, Coast, and Barista FIRE variants.",
  },
  {
    id: 5,
    label: "White Coat Investor — The 4% Rule",
    url: "https://www.whitecoatinvestor.com/the-4-rule-safe-withdrawal-rates/",
    note: "Practical explanation of the FIRE target formula (expenses ÷ SWR).",
  },
  {
    id: 6,
    label: "Wikipedia — Fisher Equation",
    url: "https://en.wikipedia.org/wiki/Fisher_equation",
    note: "Real-return formula: (1 + nominal) / (1 + inflation) − 1.",
  },
];

/**
 * Entity-level FAQ (부속M K01) — one dedicated question per FIRE type plus
 * one comparison question, each answer citing the REAL computed figure from
 * defaultResults (calculateFIRE(DEFAULT_INPUT)) above. Never a noun-swapped
 * template: every answer states that type's own multiplier and dollar
 * target, derived from the SAME engine output the cards on this page show.
 */
const FIRE_TYPES_FAQ: FaqItem[] = [
  {
    q: "How much do I need for Lean FIRE?",
    a: `Lean FIRE targets ${FIRE_MULTIPLIERS.lean * 100}% of your annual expenses divided by your SWR. At the default $${annualExpenses.toLocaleString()}/yr expenses and ${(safeWithdrawalRate * 100).toFixed(0)}% SWR, that works out to ${fmt(defaultResults.lean.targetAmount)}. It's the smallest of the five targets because it assumes you cut spending to essentials in retirement.`,
  },
  {
    q: "What's the difference between Regular FIRE and Fat FIRE?",
    a: `Regular FIRE covers 100% of your current expenses (${fmt(defaultResults.regular.targetAmount)} at the defaults); Fat FIRE covers 150% (${fmt(defaultResults.fat.targetAmount)}) for a larger cushion or higher discretionary spending. Fat FIRE's target is exactly 1.5× Regular FIRE's — same formula, different multiplier.`,
  },
  {
    q: "How is the Coast FIRE number different from the others?",
    a: `Coast FIRE isn't a percentage of expenses — it's the amount that, left untouched, compounds at your real (inflation-adjusted) return to reach the full Regular FIRE target by your retirement age. At the defaults (retire at ${retirementAge}), that seed amount is ${fmt(defaultResults.coast.targetAmount)}, discounted back from the ${fmt(defaultResults.regular.targetAmount)} Regular FIRE target.`,
  },
  {
    q: "Does Barista FIRE mean I have to work at a coffee shop?",
    a: `No — "Barista FIRE" is just the popular nickname for the strategy, borrowed from baristas who often get employer health benefits even part-time. It means your portfolio covers ${FIRE_MULTIPLIERS.barista * 100}% of expenses (${fmt(defaultResults.barista.targetAmount)} at the defaults) while any part-time job covers the rest — the job can be anything.`,
  },
  {
    q: "Which FIRE type should I aim for?",
    a: "There's no universally \"right\" type — it depends on how much you want to cut spending (Lean), keep your lifestyle unchanged (Regular), add a safety buffer (Fat), stop contributing early while still working (Coast), or ease into part-time work (Barista). Try each on the calculator with your own numbers and compare the reach ages side by side.",
  },
  {
    q: "Are these FIRE target formulas fixed, or can I adjust them?",
    a: "The 4% SWR and expense multipliers are widely used defaults (see Sources below), but every input — expenses, SWR, expected return, inflation — is a slider you control. The FIRE type multipliers (0.6x/1.0x/1.5x/0.5x) are fixed definitions of each type, not adjustable, since changing them would make it a different FIRE type.",
  },
];

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://gofirepath.com").replace(/\/$/, "");

const pageJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "FIREPath FIRE Types Sub-Calculator",
  url: `${SITE_URL}/fire-types`,
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  description:
    "Explains and illustrates all five FIRE types (Lean, Regular, Fat, Coast, Barista) with real formula derivations and interactive calculator links.",
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

/**
 * Reusable FIRE-type card.
 */
interface FireTypeCardProps {
  type: "lean" | "regular" | "fat" | "coast" | "barista";
  targetAmount: number;
  monthlyPassiveIncome: number;
  reachAge: number | null;
  children: React.ReactNode;
}

function FireTypeCard({
  type,
  targetAmount,
  monthlyPassiveIncome,
  reachAge,
  children,
}: FireTypeCardProps) {
  const color = FIRE_COLORS[type];
  const label = FIRE_LABELS[type];

  return (
    <article
      id={type}
      className="scroll-mt-20 rounded-xl border bg-card shadow-sm"
      style={{ borderLeftWidth: 4, borderLeftColor: color }}
      aria-labelledby={`${type}-heading`}
    >
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color }}
            >
              {label}
            </span>
            <h2 id={`${type}-heading`} className="text-2xl font-bold mt-0.5">
              {label}
            </h2>
          </div>

          {/* Key metrics from engine with default inputs */}
          <div className="flex gap-6 text-right">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Target</p>
              <p className="text-xl font-bold tabular-nums">{fmt(targetAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Monthly</p>
              <p className="text-xl font-bold tabular-nums">{fmt(monthlyPassiveIncome)}/mo</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Reach Age</p>
              <p className="text-xl font-bold tabular-nums">
                {reachAge !== null ? reachAge : "80+"}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground italic">
          Values shown use default inputs: age {currentAge}, ${annualExpenses.toLocaleString()}/yr
          expenses, {(safeWithdrawalRate * 100).toFixed(0)}% SWR.{" "}
          <Link href="/" className="underline underline-offset-2 hover:text-primary transition-colors duration-150">
            Adjust in the calculator
          </Link>{" "}
          to see your numbers.
        </p>

        <div className="prose prose-neutral dark:prose-invert max-w-none text-sm">{children}</div>

        <div className="flex items-center gap-2 pt-2">
          <Link
            href={`/#${type}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium underline underline-offset-2 hover:text-primary transition-colors duration-150"
            aria-label={`See ${label} on the interactive calculator`}
          >
            <Calculator className="h-3.5 w-3.5" aria-hidden="true" />
            See {label} in the calculator
          </Link>
        </div>
      </div>
    </article>
  );
}

export default function FireTypesPage() {
  // safeJsonLd escapes </> characters — same developer-authored (not
  // user-supplied) JSON-LD pattern already used across this codebase (home,
  // healthcare-bridge, guide). 부속P CODE-02: FAQPage JSON-LD is no longer
  // emitted here (deprecated for SERP display in 2026) — the FAQSection
  // below still renders the same Q&A as on-page H2/H3 text for GEO.
  const pageJson = safeJsonLd(pageJsonLd);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: pageJson }} />

      <Breadcrumbs items={[{ name: "FIRE Types", path: "/fire-types" }]} />

      {/* Header */}
      <div>
        <h1 className="text-4xl font-bold mb-2">FIRE Types Explained</h1>
        <AuthorByline lastUpdated={LAST_UPDATED} className="mb-4" />
        <p className="text-muted-foreground">
          &quot;FIRE&quot; stands for Financial Independence, Retire Early. The five variants — Lean,
          Regular, Fat, Coast, and Barista — each target a different lifestyle and spending level.
          This page explains each type, shows the formula behind it, and surfaces the computed
          target so you can see how the numbers connect.
        </p>
      </div>

      {/* 부속P CODE-01 — GEO answer block, FIRST content block after the
          header/breadcrumb chrome: query-phrased H2, 40-60 word answer,
          data table, factor list, and >=2 sourced stats — server-rendered. */}
      <AnswerBlock entity={FIRE_TYPES_ANSWER} idPrefix="fire-types-geo" />

      {/* Quick-navigation */}
      <nav aria-label="FIRE type sections" className="rounded-xl border bg-card p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Jump to
        </p>
        <div className="flex flex-wrap gap-2">
          {(["lean", "regular", "fat", "coast", "barista"] as const).map((type) => (
            <a
              key={type}
              href={`#${type}`}
              className="inline-flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs font-medium hover:shadow-md transition-shadow duration-150 focus-visible:ring-2 focus-visible:ring-ring"
              style={{ borderLeftWidth: 3, borderLeftColor: FIRE_COLORS[type] }}
            >
              {FIRE_LABELS[type]}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </a>
          ))}
        </div>
      </nav>

      {/* ── Lean FIRE ── */}
      <FireTypeCard
        type="lean"
        targetAmount={defaultResults.lean.targetAmount}
        monthlyPassiveIncome={defaultResults.lean.monthlyPassiveIncome}
        reachAge={defaultResults.lean.reachAge}
      >
        <p>
          <strong>Lean FIRE</strong> targets early retirement on <em>60% of your current annual
          expenses</em>. It assumes you will significantly cut spending — eliminating discretionary
          costs, downsizing, or moving to a lower cost-of-living area.
        </p>
        <p className="font-mono text-sm bg-muted/50 rounded px-3 py-2">
          Target = (annualExpenses × 0.6) ÷ SWR
        </p>
        <p>
          At the default {(safeWithdrawalRate * 100).toFixed(0)}% SWR and{" "}
          ${annualExpenses.toLocaleString()}/yr in expenses, the multiplier is{" "}
          {FIRE_MULTIPLIERS.lean}:{" "}
          <span className="font-mono text-sm">
            ${(annualExpenses * FIRE_MULTIPLIERS.lean).toLocaleString()} ÷{" "}
            {safeWithdrawalRate} = {fmt(defaultResults.lean.targetAmount)}
          </span>
          .
        </p>
        <p>
          The{" "}
          <Link href="/fire-types#regular">Regular FIRE</Link> target is the{" "}
          baseline; Lean FIRE is 60% of that. If 60% of your current expenses is still enough to
          cover housing, food, healthcare, and essential needs, Lean FIRE is achievable significantly
          earlier than Regular FIRE.
        </p>
      </FireTypeCard>

      {/* ── Regular FIRE ── */}
      <FireTypeCard
        type="regular"
        targetAmount={defaultResults.regular.targetAmount}
        monthlyPassiveIncome={defaultResults.regular.monthlyPassiveIncome}
        reachAge={defaultResults.regular.reachAge}
      >
        <p>
          <strong>Regular FIRE</strong> (also called &quot;Traditional FIRE&quot;) replaces your current
          lifestyle exactly — 100% of your annual expenses drawn from your portfolio.
          It is the <em>baseline</em> against which Lean, Fat, Coast, and Barista are all
          defined.
        </p>
        <p className="font-mono text-sm bg-muted/50 rounded px-3 py-2">
          Target = annualExpenses ÷ SWR
        </p>
        <p>
          This is the famous &quot;25× rule&quot; at a 4% SWR: spend $40,000/yr → need $1,000,000.
          Source: the{" "}
          <a
            href="https://en.wikipedia.org/wiki/Trinity_study"
            target="_blank"
            rel="noopener noreferrer"
          >
            Trinity Study (1998)
          </a>
          .
        </p>
        <p>
          At the defaults:{" "}
          <span className="font-mono text-sm">
            ${annualExpenses.toLocaleString()} ÷ {safeWithdrawalRate} ={" "}
            {fmt(defaultResults.regular.targetAmount)}
          </span>
          . Monthly passive income at retirement:{" "}
          <span className="font-mono text-sm">
            {fmt(defaultResults.regular.monthlyPassiveIncome)}/mo
          </span>
          .
        </p>
        <p>
          Related types: <Link href="/fire-types#lean">Lean FIRE</Link> (60% of this),{" "}
          <Link href="/fire-types#fat">Fat FIRE</Link> (150%),{" "}
          <Link href="/fire-types#coast">Coast FIRE</Link> (discounted seed amount),{" "}
          <Link href="/fire-types#barista">Barista FIRE</Link> (50%).
        </p>
      </FireTypeCard>

      {/* ── Fat FIRE ── */}
      <FireTypeCard
        type="fat"
        targetAmount={defaultResults.fat.targetAmount}
        monthlyPassiveIncome={defaultResults.fat.monthlyPassiveIncome}
        reachAge={defaultResults.fat.reachAge}
      >
        <p>
          <strong>Fat FIRE</strong> is retirement with <em>150% of your current annual expenses</em>
          , providing room for higher discretionary spending, travel, healthcare costs, or simply
          a larger safety margin.
        </p>
        <p className="font-mono text-sm bg-muted/50 rounded px-3 py-2">
          Target = (annualExpenses × 1.5) ÷ SWR
        </p>
        <p>
          At the defaults:{" "}
          <span className="font-mono text-sm">
            ${(annualExpenses * FIRE_MULTIPLIERS.fat).toLocaleString()} ÷ {safeWithdrawalRate} ={" "}
            {fmt(defaultResults.fat.targetAmount)}
          </span>
          . This is 1.5× the{" "}
          <Link href="/fire-types#regular">Regular FIRE</Link> target.
        </p>
        <p>
          Fat FIRE is pursued by people who prefer not to cut spending in retirement — or who want
          a buffer for unexpected costs (medical, family support). The higher target generally means
          a longer accumulation phase.
        </p>
      </FireTypeCard>

      {/* ── Coast FIRE ── */}
      <FireTypeCard
        type="coast"
        targetAmount={defaultResults.coast.targetAmount}
        monthlyPassiveIncome={defaultResults.coast.monthlyPassiveIncome}
        reachAge={defaultResults.coast.reachAge}
      >
        <p>
          <strong>Coast FIRE</strong> is unique: you do not need to accumulate the full Regular
          FIRE target now — you only need to reach the amount that, <em>left untouched</em>, will
          compound to the Regular FIRE target by your chosen retirement age.
        </p>
        <p className="font-mono text-sm bg-muted/50 rounded px-3 py-2">
          CoastTarget = RegularTarget ÷ (1 + realReturn)^yearsToRetirement
        </p>
        <p>
          In the default scenario (retire at {retirementAge}, real return ≈{" "}
          {((((1 + DEFAULT_INPUT.expectedReturn) / (1 + DEFAULT_INPUT.inflation) - 1) * 100)).toFixed(1)}
          %):{" "}
          <span className="font-mono text-sm">
            {fmt(defaultResults.regular.targetAmount)} ÷ (1 + realReturn)^
            {retirementAge - currentAge} = {fmt(defaultResults.coast.targetAmount)}
          </span>
          .
        </p>
        <p>
          Once you hit your Coast FIRE number, you can stop making new investment contributions —
          your portfolio coasts to the finish line on its own. Many people continue working
          part-time or in a less stressful role during this phase.
          See also: <Link href="/fire-types#barista">Barista FIRE</Link>.
        </p>
        <p>
          The monthly passive income shown ({fmt(defaultResults.coast.monthlyPassiveIncome)}/mo)
          reflects the income your <em>full Regular FIRE portfolio</em> would generate at
          retirement — not the smaller Coast seed amount — since the portfolio grows to that level
          by design.
        </p>
      </FireTypeCard>

      {/* ── Barista FIRE ── */}
      <FireTypeCard
        type="barista"
        targetAmount={defaultResults.barista.targetAmount}
        monthlyPassiveIncome={defaultResults.barista.monthlyPassiveIncome}
        reachAge={defaultResults.barista.reachAge}
      >
        <p>
          <strong>Barista FIRE</strong> (sometimes called &quot;Semi-FIRE&quot;) is a hybrid: your portfolio
          covers <em>50% of your expenses</em>, and part-time work or a side income covers the
          rest. The name comes from baristas at coffee chains who often receive employer health
          benefits even for part-time work.
        </p>
        <p className="font-mono text-sm bg-muted/50 rounded px-3 py-2">
          Target = (annualExpenses × 0.5) ÷ SWR
        </p>
        <p>
          At the defaults:{" "}
          <span className="font-mono text-sm">
            ${(annualExpenses * FIRE_MULTIPLIERS.barista).toLocaleString()} ÷ {safeWithdrawalRate}{" "}
            = {fmt(defaultResults.barista.targetAmount)}
          </span>
          .
        </p>
        <p>
          Barista FIRE reaches a lower target than{" "}
          <Link href="/fire-types#lean">Lean FIRE</Link>{" "}
          (50% vs. 60% of expenses), so you can stop contributing to investments sooner — but you
          will still need some earned income in early retirement. It is a popular choice for people
          who value leaving a stressful career but are not ready for full retirement.
        </p>
        <p>
          Healthcare note: part-time work is often chosen specifically for employer-sponsored
          health benefits, which can significantly reduce the{" "}
          <Link href="/healthcare-bridge">healthcare bridge cost</Link>{" "}
          before Medicare at 65.
        </p>
      </FireTypeCard>

      {/* Methodology note */}
      <p className="text-xs text-muted-foreground border-t border-border pt-4">
        <strong>Methodology note:</strong> All targets computed by the FIREPath engine using the
        formula <span className="font-mono">(expenses × multiplier) ÷ SWR</span>, with Coast FIRE
        discounted by the Fisher real return over years to retirement. Multipliers sourced from
        published FIRE literature (see sources). Monthly income ={" "}
        <span className="font-mono">(target × SWR) ÷ 12</span>. Full derivation at{" "}
        <Link href="/methodology" className="underline underline-offset-2">
          /methodology
        </Link>
        .
      </p>

      {/* 부속M K01 — entity-level FAQ, one question per FIRE type citing that
          type's own computed target (see FIRE_TYPES_FAQ above). */}
      <FAQSection
        items={FIRE_TYPES_FAQ}
        title="FIRE Types FAQ"
        idPrefix="fire-types-faq"
        className="pt-2"
      />

      <DisclaimerBanner />

      <AdvisorCta />

      <SourcesReferences sources={SOURCES} />

      <div className="p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <h2 className="text-2xl font-semibold mb-2">See all 5 types on one chart</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Adjust the sliders and watch all five FIRE timelines update in real time.
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
