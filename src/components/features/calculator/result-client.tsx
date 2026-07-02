'use client';

import { useEffect } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { decodeState } from '@/lib/engine/url-state';
import { FIRETimelineChart } from '@/components/features/calculator/fire-timeline-chart';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { ResultRelated } from '@/components/features/calculator/result-related';
import { ShareResultButtons } from '@/components/features/calculator/share-result-buttons';
import { ResultDisclaimer } from '@/components/compliance/ResultDisclaimer';
import { TermsGate } from '@/components/compliance/TermsGate';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import Link from 'next/link';

export function ResultClient() {
  const { output, setInput } = useCalculatorStore();

  // Hydrating from a shared hash uses setInput() (never updateInput()), so
  // interactionCount stays 0 and calculator_complete does NOT fire here —
  // only a subsequent real input change (back on the main calculator) would
  // bump interactionCount (부속I T15 §3: "treat as user-interaction, results
  // render, but do NOT fire calculator_complete until a real input change").
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const decoded = decodeState(hash);
    if (decoded) setInput(decoded);
  }, [setInput]);

  return (
    <>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-4xl font-bold">This Scenario&apos;s FIRE Results</h1>
        <div className="flex gap-2">
          <ShareResultButtons />
          <Link href="/">
            <Button size="sm">
              <Calculator className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <TermsGate className="space-y-6">
        <div className="rounded-xl border bg-card p-4 md:p-6">
          <FIRETimelineChart timeline={output.timeline} results={output.results} />
        </div>

        <FIREResultCards results={output.results} />
        <ResultDisclaimer />
      </TermsGate>

      {/* 부속I T06 — /result always shows a real (shared or freshly-computed)
          result, so the module renders unconditionally here, directly below
          the result block and above ResultMonetization (rendered by the
          parent page after this component). */}
      <ResultRelated hasResult output={output} />
    </>
  );
}
