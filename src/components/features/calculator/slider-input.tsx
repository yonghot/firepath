'use client';

import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import { formatCurrencyFull, formatPercent } from '@/lib/utils/format';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: 'dollar' | 'percent' | 'year';
  onChange: (value: number) => void;
  tooltip?: string;
}

function formatDisplay(value: number, unit: 'dollar' | 'percent' | 'year'): string {
  switch (unit) {
    case 'dollar':
      return formatCurrencyFull(value);
    case 'percent':
      return formatPercent(value);
    case 'year':
      return String(value);
  }
}

function parseInput(raw: string, unit: 'dollar' | 'percent' | 'year'): number | null {
  const cleaned = raw.replace(/[$,%\s]/g, '');
  const num = Number(cleaned);
  if (isNaN(num)) return null;
  return unit === 'percent' ? num / 100 : num;
}

export function SliderInput({
  label,
  value,
  min,
  max,
  step,
  unit,
  onChange,
  tooltip,
}: SliderInputProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">{label}</Label>
          {tooltip && (
            <Tooltip>
              <TooltipTrigger className="cursor-help">
                <Info className="h-3.5 w-3.5 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-52">
                <p className="text-xs">{tooltip}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        <Input
          type="text"
          value={formatDisplay(value, unit)}
          onChange={(e) => {
            const parsed = parseInput(e.target.value, unit);
            if (parsed !== null && parsed >= min && parsed <= max) {
              onChange(parsed);
            }
          }}
          className="h-7 w-28 text-right text-sm font-mono"
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(val) => {
          const v = Array.isArray(val) ? val[0] : val;
          onChange(v);
        }}
        className="cursor-pointer"
        aria-label={label}
      />
    </div>
  );
}
