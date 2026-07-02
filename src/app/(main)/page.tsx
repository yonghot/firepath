import type { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import { FAQSection, faqJsonLd } from '@/components/common/faq-section';
import { RelatedCalculators } from '@/components/common/related-calculators';
import { calculatorAppJsonLd, personJsonLd, breadcrumbJsonLd } from '@/components/common/json-ld';
import { ResultMonetization } from '@/components/monetization/ResultMonetization';
import { EmailMyResultsGate } from '@/components/features/calculator/email-my-results-gate';
import { HowItWorksFire } from '@/components/common/how-it-works-fire';
import { UpdatedBadge } from '@/components/common/updated-badge';
import { RecentCalculations } from '@/components/common/recent-calculations';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { getFiguresLastUpdated } from '@/lib/figures';
import { buildMeta } from '@/lib/seo';

// Use absolute to bypass the "%s | FIREPath" template from root layout —
// avoids redundant "FIREPath — ... | FIREPath" on the home page. buildMeta's
// title still satisfies the 50-60 char / keyword-first-30 / H1-lead-match
// contract; `title.absolute` just disables the template suffix on top of it.
const homeMeta = buildMeta({
  title: 'FIREPath: All 5 FIRE Types on One Live Timeline (2026)',
  description:
    'Compare LeanFIRE, RegularFIRE, FatFIRE, CoastFIRE, and BaristaFIRE on one interactive timeline. Adjust sliders and see your path to financial independence in real time.',
  path: '/',
});

export const metadata: Metadata = {
  ...homeMeta,
  title: { absolute: 'FIREPath: All 5 FIRE Types on One Live Timeline (2026)' },
};

export default async function CalculatorPage() {
  // Free tier sees ads; premium is ad-free.
  const { isPremium } = await getPremiumStatus();
  // 부속I T11 — dateModified driven by the REAL lastVerified field (never a
  // hand-stamped freshness date); the same field the "Updated for {year}"
  // badge below reads, so JSON-LD and visible copy can never drift.
  const figuresLastVerified = getFiguresLastUpdated();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(calculatorAppJsonLd({ dateModified: figuresLastVerified })),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', path: '/' }])),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-6">
        {/* Hero section — server-rendered for LCP */}
        <div className="mb-8 text-center lg:text-left">
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2 flex-wrap">
            <Flame className="h-7 w-7 text-[var(--fire-coast)]" />
            <h1 className="text-4xl font-bold">FIREPath</h1>
            <UpdatedBadge lastVerified={figuresLastVerified} className="ml-0 lg:ml-2" />
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto lg:mx-0">
            Compare 5 FIRE types — Lean, Regular, Fat, Coast &amp; Barista — on one interactive timeline. Adjust the sliders and see your path to financial independence in real time.
          </p>
        </div>

        {/* 부속I T16 — renders nothing until localStorage has entries (client-only, no hydration mismatch). */}
        <RecentCalculations className="mb-6" />

        <CalculatorClient />

        {/* Unified monetization stack — below calculator result output, env-gated.
            Includes CTA, programmatic ad, featured partners, sponsor, email capture.
            Premium users see no programmatic ads. */}
        <ResultMonetization isPremium={isPremium} />

        {/* 부속I T17 — env-gated "Email my results" (transactional-only,
            distinct from ResultMonetization's general newsletter capture).
            Absent from the DOM entirely unless EMAIL_CAPTURE_ENDPOINT +
            NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED=1 + NEXT_PUBLIC_POSTAL_ADDRESS are all set. */}
        <div className="mt-6">
          <EmailMyResultsGate />
        </div>
      </div>

      {/* 부속M K01 — on-page editorial depth (how-it-works + worked example),
          server-rendered, placed below the calculator/monetization block so
          LCP and the TermsGate overlay above are unaffected. */}
      <HowItWorksFire />

      <FAQSection />

      <RelatedCalculators />
    </>
  );
}
