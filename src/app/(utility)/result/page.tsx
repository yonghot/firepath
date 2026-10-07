import type { Metadata } from 'next';
import { ResultClient } from '@/components/features/calculator/result-client';
import { ResultMonetization } from '@/components/monetization/ResultMonetization';
import { parseFeaturedPartners } from '@/lib/monetization';
import { EmailMyResultsGate } from '@/components/features/calculator/email-my-results-gate';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { buildMeta } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/breadcrumbs';

// Shared results pages are personalized via URL hash and have no unique
// canonical value to search engines — exclude from indexing to avoid
// duplicate-content signals with the home calculator. buildMeta still sets
// alternates.canonical to the clean /result path (T10/T15: any query-param
// share-state variant canonicalizes here, never to itself with params).
export const metadata: Metadata = buildMeta({
  title: "This Scenario's FIRE Results: Full Timeline Breakdown",
  description:
    'View this personalized FIRE calculation result — compare LeanFIRE, RegularFIRE, FatFIRE, CoastFIRE, and BaristaFIRE targets on one interactive timeline.',
  path: '/result',
  robots: { index: false, follow: true },
});

export default async function ResultPage() {
  // Free tier sees ads on the RESULT page; premium subscribers see nothing.
  const { isPremium } = await getPremiumStatus();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <Breadcrumbs items={[{ name: 'Your Results', path: '/result' }]} />
      <ResultClient />
      {/* Unified monetization stack — below result output, env-gated.
          Includes CTA, programmatic ad, featured partners, sponsor, email capture.
          Premium users see no programmatic ads (isPremium gates the display slot). */}
      <ResultMonetization
        isPremium={isPremium}
        displayAd={false}
        featuredPartners={parseFeaturedPartners(process.env.MON_FEATURED_PARTNERS)}
      />

      {/* 부속I T17 — env-gated "Email my results" (transactional-only). */}
      <EmailMyResultsGate />
    </div>
  );
}
