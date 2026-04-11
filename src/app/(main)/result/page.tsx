import type { Metadata } from 'next';
import { ResultClient } from '@/components/features/calculator/result-client';

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

export default function ResultPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <ResultClient />
    </div>
  );
}
