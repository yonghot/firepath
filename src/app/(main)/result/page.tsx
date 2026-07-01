import type { Metadata } from 'next';
import { ResultClient } from '@/components/features/calculator/result-client';
import { ResultMonetization } from '@/components/monetization/ResultMonetization';
import { getPremiumStatus } from '@/lib/subscription/premium';

export const metadata: Metadata = {
  title: 'FIRE Results',
  description:
    'View your personalized FIRE (Financial Independence, Retire Early) calculation results — compare LeanFIRE, RegularFIRE, FatFIRE, CoastFIRE, and BaristaFIRE targets on one interactive timeline.',
  // Shared results pages are personalized via URL hash and have no unique
  // canonical value to search engines — exclude from indexing to avoid
  // duplicate-content signals with the home calculator.
  robots: {
    index: false,
    follow: true,
  },
};

export default async function ResultPage() {
  // Free tier sees ads on the RESULT page; premium subscribers see nothing.
  const { isPremium } = await getPremiumStatus();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <ResultClient />
      {/* Unified monetization stack — below result output, env-gated.
          Includes CTA, programmatic ad, featured partners, sponsor, email capture.
          Premium users see no programmatic ads (isPremium gates the display slot). */}
      <ResultMonetization isPremium={isPremium} />
    </div>
  );
}
