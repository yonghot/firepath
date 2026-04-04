'use client';

import { useState } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { useUrlState } from '@/hooks/use-url-state';
import { CalculatorPanel } from '@/components/features/calculator/calculator-panel';
import { FIRETimelineChart } from '@/components/features/calculator/fire-timeline-chart';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { DisclaimerBanner } from '@/components/common/disclaimer-banner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { SlidersHorizontal } from 'lucide-react';
import type { FIREType } from '@/types/fire.types';

export default function CalculatorPage() {
  const { output } = useCalculatorStore();
  const [highlightedType, setHighlightedType] = useState<FIREType | null>(null);

  useUrlState();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[320px] shrink-0">
          <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-6rem)] pr-2">
            <CalculatorPanel />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 space-y-6 min-w-0">
          {/* Mobile trigger */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger className="w-full inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Adjust Parameters
              </SheetTrigger>
              <SheetContent side="bottom" className="h-[80vh] overflow-y-auto">
                <div className="py-4">
                  <CalculatorPanel />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {/* Chart */}
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h2 className="text-lg font-semibold mb-4">FIRE Timeline</h2>
            <FIRETimelineChart
              timeline={output.timeline}
              results={output.results}
              highlightedType={highlightedType}
            />
          </div>

          {/* Result cards */}
          <div>
            <h2 className="text-lg font-semibold mb-3">Your FIRE Numbers</h2>
            <FIREResultCards
              results={output.results}
              onHighlight={setHighlightedType}
            />
          </div>

          {/* Disclaimer */}
          <DisclaimerBanner />
        </div>
      </div>
    </div>
  );
}
