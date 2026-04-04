'use client';

import { SliderInput } from './slider-input';
import { Button } from '@/components/ui/button';
import { RotateCcw, Share2 } from 'lucide-react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { SLIDER_CONFIGS } from '@/constants/fire-defaults';
import { encodeState } from '@/lib/engine/url-state';
import { toast } from 'sonner';

export function CalculatorPanel() {
  const { input, updateInput, resetToDefaults } = useCalculatorStore();

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
        <h2 className="text-lg font-semibold">Parameters</h2>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4 mr-1" />
            Reset
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-1" />
            Share
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        {SLIDER_CONFIGS.map((config) => (
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
    </div>
  );
}
