'use client';

import { SliderInput } from './slider-input';
import { Button } from '@/components/ui/button';
import { ChevronRight, RotateCcw, Share2 } from 'lucide-react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { useTermsConsent } from '@/hooks/use-terms-consent';
import { SLIDER_CONFIGS } from '@/constants/fire-defaults';
import { encodeState } from '@/lib/engine/url-state';
import { countChangedAdvanced } from '@/lib/utils/advanced-inputs';
import { toast } from 'sonner';

const PRIMARY_CONFIGS = SLIDER_CONFIGS.filter((config) => !config.advanced);
const ADVANCED_CONFIGS = SLIDER_CONFIGS.filter((config) => config.advanced);

export function CalculatorPanel() {
  const { input, updateInput, resetToDefaults, advancedOpen, setAdvancedOpen } = useCalculatorStore();
  const accepted = useTermsConsent();
  const changedAdvanced = countChangedAdvanced(input);

  const handleShare = async () => {
    const hash = encodeState(input);
    const url = `${window.location.origin}/result#${hash}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied to clipboard!');
    } catch {
      toast.error('Failed to copy link');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Parameters</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          {accepted === true && (
            <Button variant="outline" size="sm" onClick={handleShare}>
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {PRIMARY_CONFIGS.map((config) => (
          <SliderInput
            key={config.key}
            label={config.label}
            value={input[config.key]}
            min={config.min}
            max={config.max}
            step={config.step}
            unit={config.unit}
            tooltip={config.tooltip}
            onChange={(value) => updateInput(config.key, value)}
          />
        ))}
      </div>

      <details
        open={advancedOpen}
        onToggle={(event) => setAdvancedOpen(event.currentTarget.open)}
        className="group rounded-xl border border-border"
      >
        <summary className="block min-h-11 cursor-pointer list-none rounded-xl px-3 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <span className="flex items-center gap-2">
            <ChevronRight
              className="h-4 w-4 shrink-0 transition-transform duration-200 group-open:rotate-90 motion-reduce:transition-none"
              aria-hidden="true"
            />
            <span className="text-sm font-medium">Advanced</span>
            <span className="ml-auto min-w-20 text-right text-sm text-muted-foreground tabular-nums">
              {changedAdvanced > 0 ? `${changedAdvanced} changed` : ''}
            </span>
          </span>
          <span className="mt-1 block pl-6 text-sm text-muted-foreground">
            Net worth, retirement age, return, inflation, withdrawal rate
          </span>
        </summary>
        <div className="space-y-4 px-3 pb-4 pt-2">
          {/* A closed <details> has no layout to measure, so edge-aligned thumbs would sit at the wrong place; keep center. */}
          {ADVANCED_CONFIGS.map((config) => (
            <SliderInput
              key={config.key}
              label={config.label}
              value={input[config.key]}
              min={config.min}
              max={config.max}
              step={config.step}
              unit={config.unit}
              tooltip={config.tooltip}
              thumbAlignment="center"
              onChange={(value) => updateInput(config.key, value)}
            />
          ))}
        </div>
      </details>
    </div>
  );
}
