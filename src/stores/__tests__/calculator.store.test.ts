/**
 * calculator.store.ts — unit tests (부속I T03 hasUserInteracted guard)
 *
 * interactionCount is the single source of truth CalculatorClient uses to
 * decide whether calc_input_start / calculator_complete may fire. It must:
 *   1. start at 0 on the initial (SSR/default) state
 *   2. increment on every real user-driven updateInput() call
 *   3. NEVER increment on setInput() (used to hydrate from a shared URL hash
 *      / #result restore — not a real user interaction)
 *   4. NEVER increment on resetToDefaults()
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useCalculatorStore } from '@/stores/calculator.store';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';

beforeEach(() => {
  useCalculatorStore.setState({
    input: DEFAULT_INPUT,
    interactionCount: 0,
  });
});

describe('calculator.store interactionCount (hasUserInteracted guard)', () => {
  it('starts at 0 on the default/initial state', () => {
    expect(useCalculatorStore.getState().interactionCount).toBe(0);
  });

  it('increments on a real user-driven updateInput() call', () => {
    useCalculatorStore.getState().updateInput('currentAge', 40);
    expect(useCalculatorStore.getState().interactionCount).toBe(1);
  });

  it('increments once per updateInput() call, in order', () => {
    useCalculatorStore.getState().updateInput('currentAge', 40);
    useCalculatorStore.getState().updateInput('retirementAge', 60);
    useCalculatorStore.getState().updateInput('savingsRate', 0.3);
    expect(useCalculatorStore.getState().interactionCount).toBe(3);
  });

  it('does NOT increment on setInput() (URL-hash / shared-result hydration)', () => {
    useCalculatorStore.getState().setInput({ ...DEFAULT_INPUT, currentAge: 45 });
    expect(useCalculatorStore.getState().interactionCount).toBe(0);
  });

  it('does NOT increment on resetToDefaults()', () => {
    useCalculatorStore.getState().updateInput('currentAge', 40);
    expect(useCalculatorStore.getState().interactionCount).toBe(1);

    useCalculatorStore.getState().resetToDefaults();
    // resetToDefaults doesn't touch interactionCount at all — it stays at
    // whatever it was (guard logic lives in the consuming component's refs,
    // not the store), but critically a reset alone must not increment it.
    expect(useCalculatorStore.getState().interactionCount).toBe(1);
  });

  it('setInput() followed by a real updateInput() still increments exactly once', () => {
    useCalculatorStore.getState().setInput({ ...DEFAULT_INPUT, currentAge: 45 });
    expect(useCalculatorStore.getState().interactionCount).toBe(0);

    useCalculatorStore.getState().updateInput('currentAge', 50);
    expect(useCalculatorStore.getState().interactionCount).toBe(1);
  });
});
