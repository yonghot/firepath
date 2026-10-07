import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame } from 'lucide-react';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import { FAQSection } from '@/components/common/faq-section';
import { calculatorAppJsonLd, breadcrumbJsonLd } from '@/components/common/json-ld';
import { ResultMonetization } from '@/components/monetization/ResultMonetization';
import { parseFeaturedPartners } from '@/lib/monetization';
import { EmailMyResultsGate } from '@/components/features/calculator/email-my-results-gate';
import { HowItWorksFire } from '@/components/common/how-it-works-fire';
import { SeasonBadge } from '@/components/common/season-badge';
import { RecentCalculations } from '@/components/common/recent-calculations';
import { EmbedSnippet } from '@/components/common/embed-snippet';
import { AnswerBlock } from '@/components/common/answer-block';
import { HOME_ANSWER_LEAD, MAIN_CALCULATOR_ANSWER } from '@/lib/seo/geo-entities';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { getPageLastModified } from '@/lib/content-pages';
import { buildMeta } from '@/lib/seo';
import { formatIsoDate } from '@/lib/utils/format';

// Absolute title bypasses the "%s | FIREPath" template; it is the same text as the H1 so search engines have nothing to rewrite.
const HOME_TITLE = 'FIRE Calculator: How Much Do You Need to Retire Early?';

const homeMeta = buildMeta({
  title: HOME_TITLE,
  description:
    'Free FIRE calculator: enter your age, expenses and savings to see how much you need to retire early under Lean, Regular, Fat, Coast and Barista FIRE.',
  path: '/',
});

export const metadata: Metadata = {
  ...homeMeta,
  title: { absolute: HOME_TITLE },
};

export default async function CalculatorPage() {
  // Free tier sees ads; premium is ad-free.
  const { isPremium } = await getPremiumStatus();
  const pageUpdated = getPageLastModified('/');

  return (
    <>
      {/* 부속P CODE-02: FAQPage JSON-LD is no longer emitted here (deprecated
          for SERP display in 2026) — FAQSection below still renders the same
          Q&A as on-page H2/H3 text for GEO. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(calculatorAppJsonLd({ dateModified: pageUpdated })),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbJsonLd([{ name: 'Home', path: '/' }])),
        }}
      />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="mb-6">
          <div className="mb-2 flex items-start gap-2">
            <Flame className="mt-1 h-7 w-7 shrink-0 text-[var(--fire-coast)]" aria-hidden="true" />
            <h1 className="text-3xl font-bold sm:text-4xl">{HOME_TITLE}</h1>
          </div>
          <p data-answer-lead="true" className="max-w-2xl text-base leading-relaxed">
            With the default inputs ({HOME_ANSWER_LEAD.conditions}), Regular FIRE needs {HOME_ANSWER_LEAD.regular}, Lean
            FIRE {HOME_ANSWER_LEAD.lean} and Fat FIRE {HOME_ANSWER_LEAD.fat}. Source for the 4% rate:{' '}
            <a
              href={HOME_ANSWER_LEAD.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-primary"
            >
              {HOME_ANSWER_LEAD.sourceLabel}
            </a>
            . Updated <time dateTime={pageUpdated}>{formatIsoDate(pageUpdated)}</time>.
          </p>
          <p data-disclaimer-summary="true" className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Estimates for general information only, not financial advice.{' '}
            <a href="#results-disclaimer" className="underline underline-offset-2 hover:text-foreground">
              Read the full disclaimer
            </a>
            .
          </p>
          <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
            New to FIRE? See how each type works in{' '}
            <Link href="/fire-types" className="underline underline-offset-2 hover:text-primary">
              FIRE Types Explained
            </Link>{' '}
            or read{' '}
            <Link href="/fire-guide" className="underline underline-offset-2 hover:text-primary">
              The Complete FIRE Guide
            </Link>
            . Change any input to try your own numbers; you agree to the terms before they are shown.
          </p>
        </div>

        {/* 부속I T16 — renders nothing until localStorage has entries (client-only, no hydration mismatch). */}
        <RecentCalculations className="mb-6" />

        <CalculatorClient premiumAvailable={isPremiumPurchasable()} />

        {/* Unified monetization stack — below calculator result output, env-gated.
            Includes CTA, programmatic ad, featured partners, sponsor, email capture.
            Premium users see no programmatic ads. */}
        <ResultMonetization
          isPremium={isPremium}
          featuredPartners={parseFeaturedPartners(process.env.MON_FEATURED_PARTNERS)}
        />

        {/* 부속I T17 — env-gated "Email my results" (transactional-only,
            distinct from ResultMonetization's general newsletter capture).
            Absent from the DOM entirely unless EMAIL_CAPTURE_ENDPOINT +
            NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED=1 + NEXT_PUBLIC_POSTAL_ADDRESS are all set. */}
        <div className="mt-6">
          <EmailMyResultsGate />
        </div>
      </div>

      {/* 부속P CODE-01 — GEO answer block, server-rendered, placed right
          after the calculator/monetization block (before the longer-form
          HowItWorksFire prose) so it stays a high, extractable passage. */}
      <div className="mx-auto max-w-7xl px-4">
        <SeasonBadge className="mb-6" />
        <AnswerBlock entity={MAIN_CALCULATOR_ANSWER} idPrefix="home-geo" className="mb-8" />
      </div>

      {/* 부속M K01 — on-page editorial depth (how-it-works + worked example),
          server-rendered, placed below the calculator/monetization block so
          LCP and the TermsGate overlay above are unaffected. */}
      <HowItWorksFire />

      <FAQSection />

      {/* 부속P CODE-03 — "Embed this calculator" copy-to-clipboard panel on
          the main calculator page (same component as /embed-this). */}
      <div className="mx-auto max-w-3xl px-4 pb-12">
        <EmbedSnippet />
      </div>
    </>
  );
}
