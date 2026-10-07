'use client';

import { useId, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Info } from 'lucide-react';
import {
  commitDraft,
  fieldText,
  startDraft,
  type FieldDraft,
  type FieldUnit,
} from '@/lib/utils/number-field';

interface SliderInputProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: FieldUnit;
  onChange: (value: number) => void;
  tooltip?: string;
  thumbAlignment?: 'center' | 'edge';
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
  thumbAlignment = 'edge',
}: SliderInputProps) {
  const inputId = useId();
  const [draft, setDraft] = useState<FieldDraft | null>(null);

  const commit = () => {
    const next = commitDraft(draft, value, unit, min, max);
    setDraft(null);
    if (next !== null) onChange(next);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Label htmlFor={inputId} className="text-sm font-medium">{label}</Label>
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
          id={inputId}
          type="text"
          inputMode={unit === 'year' ? 'numeric' : 'decimal'}
          value={fieldText(draft, value, unit)}
          onFocus={(e) => e.target.select()}
          onChange={(e) => setDraft(startDraft(e.target.value, value))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Escape') {
              setDraft(null);
            }
          }}
          className="h-7 w-28 text-right text-sm font-mono"
          aria-label={`${label} value`}
        />
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        thumbAlignment={thumbAlignment}
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
