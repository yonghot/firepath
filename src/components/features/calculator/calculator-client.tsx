'use client';

import { useEffect, useRef, useState } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { useScenarioStore } from '@/stores/scenario.store';
import { useUrlState } from '@/hooks/use-url-state';
import { CalculatorPanel } from '@/components/features/calculator/calculator-panel';
import { CalculatorPresets } from '@/components/features/calculator/calculator-presets';
import { FIRETimelineChart } from '@/components/features/calculator/fire-timeline-chart';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { ScenarioManager } from '@/components/features/scenario/scenario-manager';
import { ScenarioComparison } from '@/components/features/scenario/scenario-comparison';
import { MonteCarloPanel } from '@/components/features/monte-carlo/monte-carlo-panel';
import { PortfolioPanel } from '@/components/features/portfolio/portfolio-panel';
import { SaveCalculationButton } from '@/components/features/calculator/save-calculation-button';
import { ShareResultButtons } from '@/components/features/calculator/share-result-buttons';
import { ResultRelated } from '@/components/features/calculator/result-related';
import { ResultDisclaimer } from '@/components/compliance/ResultDisclaimer';
import { TermsGate } from '@/components/compliance/TermsGate';
import { ContinueBanner } from '@/components/common/continue-banner';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { SlidersHorizontal } from 'lucide-react';
import type { FIREType, FIREInput, Scenario } from '@/types/fire.types';
import { trackEvent, IS_SENSITIVE_SITE } from '@/lib/analytics';
import { useCalculatorPersistence } from '@/hooks/use-calculator-persistence';

type ViewMode = 'calculator' | 'compare';

/** Stable calc_type slug for this calculator (부속I T03). */
const CALC_TYPE = 'fire_timeline';
/** Minimum ms between calculator_complete events per calc_type (debounce). */
const COMPLETE_DEBOUNCE_MS = 2000;

/**
 * Coarse, output-derived bucket for the Regular-FIRE target amount — never
 * the raw dollar value. FIREPath is not IS_SENSITIVE_SITE, so this is safe
 * to include; the caller still gates on IS_SENSITIVE_SITE defensively should
 * this component ever be reused on a sensitive site build.
 */
function bucketTargetAmount(targetAmount: number): string {
  if (targetAmount < 500_000) return 'under_500k';
  if (targetAmount < 1_000_000) return '500k_1m';
  if (targetAmount < 2_500_000) return '1m_2.5m';
  return 'over_2.5m';
}

export function CalculatorClient({
  premiumAvailable = false,
  embedded = false,
}: {
  premiumAvailable?: boolean;
  embedded?: boolean;
}) {
  const { input, output, interactionCount, setInput } = useCalculatorStore();
  const { scenarios, compareIds } = useScenarioStore();
  const [highlightedType, setHighlightedType] = useState<FIREType | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('calculator');

  useUrlState();

  // 부속I T16 — localStorage persistence. save() is called from the same
  // interaction effect below (only on a REAL user-driven change, never on
  // the default render). applyRestore() hydrates via setInput() — like
  // hash-restoration (T15), this does NOT bump interactionCount, so
  // restoring a save never itself fires calculator_complete.
  const { pendingRestore, applyRestore, dismissRestore, save } = useCalculatorPersistence<FIREInput>({
    calcType: CALC_TYPE,
    path: '/',
    onRestore: setInput,
  });

  // 부속I T03 — calc_input_start / calculator_complete funnel.
  // interactionCount only increments on a real user-driven slider/field
  // change (see calculator.store.ts updateInput) — never on the initial
  // SSR/default render, hash-restored state, or resetToDefaults. This is the
  // hasUserInteracted guard: calc_input_start fires exactly once on the
  // first real change, calculator_complete fires on every change after that
  // (debounced to at most one per 2s) since a result re-renders as a direct
  // consequence of each interaction.
  const hasStartedRef = useRef(false);
  const lastInteractionCountRef = useRef(0);
  const lastCompleteAtRef = useRef(0);

  useEffect(() => {
    if (interactionCount === 0) return;
    if (interactionCount === lastInteractionCountRef.current) return;
    lastInteractionCountRef.current = interactionCount;

    if (!hasStartedRef.current) {
      hasStartedRef.current = true;
      trackEvent('calc_input_start', { calc_type: CALC_TYPE });
    }

    // 부속I T16 — persist the latest real input state on every actual change
    // (not gated by the calculator_complete debounce below; auto-save should
    // reflect the user's current inputs even between debounce windows).
    save(input);

    const now = Date.now();
    if (now - lastCompleteAtRef.current < COMPLETE_DEBOUNCE_MS) return;
    lastCompleteAtRef.current = now;
    trackEvent('calculator_complete', {
      calc_type: CALC_TYPE,
      ...(!IS_SENSITIVE_SITE
        ? { result_bucket: bucketTargetAmount(output.results.regular.targetAmount) }
        : {}),
    });
    // `output`/`save`/`input` are intentionally excluded from deps: they're
    // read at event-fire time only (latest value via closure over component
    // scope on each render), and this effect must key SOLELY on
    // interactionCount (the hasUserInteracted signal) — reacting to their
    // changes too would break the debounce-per-interaction contract.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interactionCount]);

  const compareScenarios: [Scenario, Scenario] | null = (() => {
    if (!compareIds) return null;
    const first = scenarios.find((s) => s.id === compareIds[0]);
    const second = scenarios.find((s) => s.id === compareIds[1]);
    return first && second ? [first, second] : null;
  })();

  return (
    <div className="space-y-4">
      {/* 부속U U-01 — one-click preset scenarios, above-fold and adjacent to
          the calculator inputs on EVERY viewport (unlike CalculatorPanel,
          which lives inside a collapsed bottom sheet on mobile). */}
      <CalculatorPresets />

      {/* 부속I T16 — "Continue where you left off" banner */}
      {pendingRestore !== null && (
        <ContinueBanner onApply={applyRestore} onDismiss={dismissRestore} />
      )}

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
              {/* TermsGate: FIREPath recalculates live as sliders move, so there is
                  no single "calculate" action to gate. Instead we gate the RESULTS
                  surface (chart + result cards) itself with a non-dismissable
                  overlay until the user affirmatively agrees. Sliders/inputs in
                  the sidebar above remain fully usable while this is showing. */}
              <TermsGate className="space-y-6">
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
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 className="text-3xl font-bold">This Scenario&apos;s FIRE Numbers</h2>
                    <div className="flex items-center gap-2">
                      <ShareResultButtons />
                      <SaveCalculationButton />
                    </div>
                  </div>
                  <FIREResultCards
                    results={output.results}
                    onHighlight={setHighlightedType}
                  />
                </div>

                {/* Disclaimer — placed directly adjacent to the result output it describes. */}
                <ResultDisclaimer embedded={embedded} />
              </TermsGate>

              {/* 부속I T06 — internal sibling-link module, directly below the
                  result block, above any below-result ad slot (ResultMonetization,
                  rendered by the parent page after this component). Gated on the
                  same hasUserInteracted signal as calc_input_start/calculator_complete
                  (interactionCount > 0) so it never renders on the default SSR
                  render. mt-6 + its own card border gives >=24px visual separation
                  and a distinct treatment from AdSlot's dashed placeholder. */}
              <ResultRelated hasResult={interactionCount > 0} output={output} embedded={embedded} />

              {premiumAvailable && (
                <>
                  <MonteCarloPanel
                    input={input}
                    results={output.results}
                    isPremium={false}
                    embedded={embedded}
                  />
                  <PortfolioPanel
                    input={input}
                    results={output.results}
                    isPremium={false}
                    embedded={embedded}
                  />
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
