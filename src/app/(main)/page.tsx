import type { Metadata } from 'next';
import { Flame } from 'lucide-react';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';

export const metadata: Metadata = {
  // Use absolute to bypass the "%s | FIREPath" template from root layout —
  // avoids redundant "FIREPath — ... | FIREPath" on the home page.
  title: { absolute: 'FIREPath — All FIRE Types in One Beautiful Calculator' },
  description:
    'Compare LeanFIRE, RegularFIRE, FatFIRE, CoastFIRE, and BaristaFIRE on one interactive timeline. Adjust sliders and see your path to financial independence in real time.',
  alternates: { canonical: '/' },
};

export default function CalculatorPage() {
  return (
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
    </div>
  );
}
