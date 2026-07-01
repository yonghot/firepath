import type { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import { FAQSection, faqJsonLd } from '@/components/common/faq-section';
import { RelatedCalculators } from '@/components/common/related-calculators';
import { calculatorAppJsonLd, breadcrumbJsonLd } from '@/components/common/json-ld';
import { ResultMonetization } from '@/components/monetization/ResultMonetization';
import { getPremiumStatus } from '@/lib/subscription/premium';

export const metadata: Metadata = {
  // Use absolute to bypass the "%s | FIREPath" template from root layout —
  // avoids redundant "FIREPath — ... | FIREPath" on the home page.
  title: { absolute: 'FIREPath — All FIRE Types in One Beautiful Calculator' },
  description:
    'Compare LeanFIRE, RegularFIRE, FatFIRE, CoastFIRE, and BaristaFIRE on one interactive timeline. Adjust sliders and see your path to financial independence in real time.',
  alternates: { canonical: '/' },
};

export default async function CalculatorPage() {
  // Free tier sees ads; premium is ad-free.
  const { isPremium } = await getPremiumStatus();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd()) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(calculatorAppJsonLd()) }}
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
          <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
            <Flame className="h-7 w-7 text-[var(--fire-coast)]" />
            <h1 className="text-4xl font-bold">FIREPath</h1>
          </div>
          <p className="text-muted-foreground max-w-xl mx-auto lg:mx-0">
            Compare 5 FIRE types — Lean, Regular, Fat, Coast &amp; Barista — on one interactive timeline. Adjust the sliders and see your path to financial independence in real time.
          </p>
        </div>

        <CalculatorClient />

        {/* Unified monetization stack — below calculator result output, env-gated.
            Includes CTA, programmatic ad, featured partners, sponsor, email capture.
            Premium users see no programmatic ads. */}
        <ResultMonetization isPremium={isPremium} />
      </div>

      <FAQSection />

      <RelatedCalculators />
    </>
  );
}
