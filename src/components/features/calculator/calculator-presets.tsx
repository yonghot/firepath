'use client';

/**
 * CalculatorPresets — one-click "Try:" scenario buttons (부속U U-01).
 *
 * Renders above-fold, directly above the calculator inputs, on every
 * viewport (desktop sidebar AND mobile, where CalculatorPanel itself lives
 * inside a collapsed bottom sheet — presets must NOT depend on the sheet
 * being open). Clicking a preset calls `updateInput()` for every field of
 * the scenario — the exact same store action a manual slider drag calls
 * (see calculator.store.ts) — so:
 *
 *   - `interactionCount` increments exactly like a real edit → the existing
 *     부속I T03 hasUserInteracted guard in CalculatorClient fires
 *     `calc_input_start` once and `calculator_complete` (debounced) with
 *     ONLY `{ calc_type, result_bucket }` — no `preset` param is ever added,
 *     because this component never calls trackEvent() itself.
 *   - A preset is an example scenario: its results show without agreement,
 *     labelled "Example". Presets never touch the terms consent record, so
 *     the clickwrap is never bypassed (compliance wins per 부속U §7).
 *
 * Visually: solid bg-card + border (rounded-xl, design/required.md token
 * scale), NEVER the dashed `border-dashed` placeholder style AdSlot uses —
 * see ad-slot.tsx — so this reads as product UI, not an ad unit. It also
 * only ever renders inside CalculatorClient, which ad-exclusion-zones.test.ts
 * (부속M K05) already asserts never mounts AdSlot/AdProvider/
 * ResultMonetization, and the nearest ad (ResultMonetization) is a page-level
 * sibling rendered only after the entire chart + result cards + Monte Carlo
 * + portfolio panel block — far more than the 150px minimum separation.
 */

import { Button } from '@/components/ui/button';
import { useCalculatorStore } from '@/stores/calculator.store';
import { CALCULATOR_PRESETS } from '@/constants/calculator-presets';
import type { FIREInput } from '@/types/fire.types';
import { Sparkles } from 'lucide-react';

export function CalculatorPresets() {
  const updateInput = useCalculatorStore((s) => s.updateInput);

  const applyPreset = (input: FIREInput) => {
    // Inject every field via updateInput() — never setInput() — so each
    // field bumps interactionCount through the real user-edit code path
    // (setInput() is reserved for non-interactive hydration: URL-hash
    // restore, "Continue where you left off"; using it here would silently
    // suppress calc_input_start/calculator_complete for a preset click).
    (Object.keys(input) as Array<keyof FIREInput>).forEach((key) => {
      updateInput(key, input[key]);
    });
  };

  return (
    <div className="rounded-xl border bg-card p-4" data-testid="calculator-presets">
      <div className="flex items-center gap-1.5 mb-2.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        Quick start
      </div>
      <div className="flex flex-wrap gap-2">
        {CALCULATOR_PRESETS.map((preset) => (
          <Button
            key={preset.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => applyPreset(preset.input)}
            aria-label={`Fill the calculator with the ${preset.label.replace(/^Try: /, '')} scenario`}
          >
            {preset.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
