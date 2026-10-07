'use client';

import { useEffect } from 'react';
import { CalculatorPanel } from '@/components/features/calculator/calculator-panel';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCalculatorStore } from '@/stores/calculator.store';

export function AdvancedToggle() {
  const advancedOpen = useCalculatorStore((state) => state.advancedOpen);

  useEffect(() => {
    const details = document.querySelector('details');
    if (!details) throw new Error('the panel renders no <details>');
    details.open = true;
    details.dispatchEvent(new Event('toggle'));
  }, []);

  return (
    <TooltipProvider>
      <CalculatorPanel />
      <output data-flag={String(advancedOpen)} />
    </TooltipProvider>
  );
}
