'use client';

import { useEffect } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { decodeState } from '@/lib/engine/url-state';
import { ResultsPanel } from '@/components/features/calculator/results-panel';
import { ResultRelated } from '@/components/features/calculator/result-related';
import { ShareResultButtons } from '@/components/features/calculator/share-result-buttons';
import { TermsGate } from '@/components/compliance/TermsGate';
import { useGatedResult } from '@/hooks/use-gated-result';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';
import Link from 'next/link';

export function ResultClient() {
  const setInput = useCalculatorStore((s) => s.setInput);
  const { gated, accepted } = useGatedResult();

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
          {accepted === true && <ShareResultButtons />}
          <Link href="/">
            <Button size="sm">
              <Calculator className="h-4 w-4 mr-1" />
              Edit
            </Button>
          </Link>
        </div>
      </div>

      <TermsGate className="space-y-6">
        <ResultsPanel gated={gated} accepted={accepted} showActions={false} />
      </TermsGate>

      <ResultRelated output={gated.output} input={gated.input} />
    </>
  );
}
