'use client';

import type { FIREType } from '@/types/fire.types';
import type { GatedResult } from '@/lib/engine/example-scenarios';
import { FIRETimelineChart } from '@/components/features/calculator/fire-timeline-chart';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { ResultCaption } from '@/components/features/calculator/result-caption';
import { ShareResultButtons } from '@/components/features/calculator/share-result-buttons';
import { SaveCalculationButton } from '@/components/features/calculator/save-calculation-button';
import { ResultDisclaimer } from '@/components/compliance/ResultDisclaimer';

interface ResultsPanelProps {
  gated: GatedResult;
  accepted: boolean | null;
  embedded?: boolean;
  showActions?: boolean;
  highlightedType?: FIREType | null;
  onHighlight?: (type: FIREType | null) => void;
}

export function ResultsPanel({
  gated,
  accepted,
  embedded,
  showActions = true,
  highlightedType = null,
  onHighlight,
}: ResultsPanelProps) {
  const { output } = gated;
  return (
    <div id="fire-results" tabIndex={-1} className="space-y-6 outline-none">
      <ResultCaption gated={gated} />

      <div className="rounded-xl border bg-card p-4 md:p-6">
        <h2 className="text-3xl font-bold mb-4">FIRE Timeline</h2>
        <FIRETimelineChart timeline={output.timeline} results={output.results} highlightedType={highlightedType} />
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-3xl font-bold">This Scenario&apos;s FIRE Numbers</h2>
          {showActions && accepted === true && (
            <div className="flex items-center gap-2">
              <ShareResultButtons />
              <SaveCalculationButton />
            </div>
          )}
        </div>
        <FIREResultCards results={output.results} onHighlight={onHighlight} embedded={embedded} />
      </div>

      <ResultDisclaimer embedded={embedded} />
    </div>
  );
}
