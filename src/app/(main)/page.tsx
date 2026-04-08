'use client';

import { useState } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { useScenarioStore } from '@/stores/scenario.store';
import { useUrlState } from '@/hooks/use-url-state';
import { CalculatorPanel } from '@/components/features/calculator/calculator-panel';
import { FIRETimelineChart } from '@/components/features/calculator/fire-timeline-chart';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { ScenarioManager } from '@/components/features/scenario/scenario-manager';
import { ScenarioComparison } from '@/components/features/scenario/scenario-comparison';
import { MonteCarloPanel } from '@/components/features/monte-carlo/monte-carlo-panel';
import { PortfolioPanel } from '@/components/features/portfolio/portfolio-panel';
import { SaveCalculationButton } from '@/components/features/calculator/save-calculation-button';
import { DisclaimerBanner } from '@/components/common/disclaimer-banner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SlidersHorizontal } from 'lucide-react';
import type { FIREType, Scenario } from '@/types/fire.types';
import { Flame } from 'lucide-react';

type ViewMode = 'calculator' | 'compare';

export default function CalculatorPage() {
  const { input, output } = useCalculatorStore();
  const { scenarios, compareIds } = useScenarioStore();
  const [highlightedType, setHighlightedType] = useState<FIREType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calculator');

  useUrlState();

  const compareScenarios: [Scenario, Scenario] | null = (() => {
    if (!compareIds) return null;
    const first = scenarios.find((s) => s.id === compareIds[0]);
    const second = scenarios.find((s) => s.id === compareIds[1]);
    return first && second ? [first, second] : null;
  })();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      {/* Hero section */}
      <div className="mb-8 text-center lg:text-left">
        <div className="flex items-center justify-center lg:justify-start gap-2 mb-2">
          <Flame className="h-7 w-7 text-[var(--fire-coast)]" />
          <h1 className="text-4xl font-bold">FIREPath</h1>
        </div>
        <p className="text-muted-foreground max-w-xl mx-auto lg:mx-0">
          Compare 5 FIRE types — Lean, Regular, Fat, Coast &amp; Barista — on one interactive timeline. Adjust the sliders and see your path to financial independence in real time.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[320px] shrink-0">
          <div className="sticky top-20 overflow-y-auto max-h-[calc(100vh-6rem)] pr-2 space-y-4">
            <CalculatorPanel />
            <Separator />
            <ScenarioManager onCompare={() => setViewMode('compare')} />
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
                <div className="py-4 space-y-4">
                  <CalculatorPanel />
                  <Separator />
                  <ScenarioManager onCompare={() => setViewMode('compare')} />
                </div>
              </SheetContent>
            </Sheet>
          </div>

          {viewMode === 'compare' && compareScenarios ? (
            <ScenarioComparison
              scenarios={compareScenarios}
              onBack={() => setViewMode('calculator')}
            />
          ) : (
            <>
              {/* Chart */}
              <div className="rounded-xl border bg-card p-4 md:p-6">
                <h2 className="text-3xl font-bold mb-4">FIRE Timeline</h2>
                <FIRETimelineChart
                  timeline={output.timeline}
                  results={output.results}
                  highlightedType={highlightedType}
                />
              </div>

              {/* Result cards */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-3xl font-bold">Your FIRE Numbers</h2>
                  <SaveCalculationButton />
                </div>
                <FIREResultCards
                  results={output.results}
                  onHighlight={setHighlightedType}
                />
              </div>

              {/* Monte Carlo Simulation */}
              <MonteCarloPanel
                input={input}
                results={output.results}
                isPremium={false}
              />

              {/* Portfolio Optimization */}
              <PortfolioPanel
                input={input}
                results={output.results}
                isPremium={false}
              />
            </>
          )}

          {/* Disclaimer */}
          <DisclaimerBanner />
        </div>
      </div>
    </div>
  );
}
