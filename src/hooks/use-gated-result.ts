'use client';

import { useMemo } from 'react';
import { useCalculatorStore } from '@/stores/calculator.store';
import { useTermsConsent } from '@/hooks/use-terms-consent';
import { gateResult, type GatedResult } from '@/lib/engine/example-scenarios';

export function useGatedResult(): { gated: GatedResult; accepted: boolean | null } {
  const input = useCalculatorStore((s) => s.input);
  const output = useCalculatorStore((s) => s.output);
  const accepted = useTermsConsent();
  const gated = useMemo(() => gateResult({ input, output, accepted }), [input, output, accepted]);
  return { gated, accepted };
}
