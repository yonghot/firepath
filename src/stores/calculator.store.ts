'use client';

import { create } from 'zustand';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { calculateFIRE } from '@/lib/engine/fire-calculator';

interface CalculatorState {
  input: FIREInput;
  output: FIREOutput;
  /**
   * Incremented ONLY by updateInput() — a real, user-driven slider/field
   * change. Never bumped by setInput() (used to hydrate from a shared URL
   * hash) or resetToDefaults(). Consumed by CalculatorClient (부속I T03) as
   * the single source of truth for "did a human actually interact with this
   * calculator", so calc_input_start / calculator_complete never fire on the
   * default SSR render or on hash-restored state.
   */
  interactionCount: number;
  advancedOpen: boolean;
  setAdvancedOpen: (open: boolean) => void;
  updateInput: <K extends keyof FIREInput>(key: K, value: FIREInput[K]) => void;
  setInput: (input: FIREInput) => void;
  resetToDefaults: () => void;
}

const initialOutput = calculateFIRE(DEFAULT_INPUT);

export const useCalculatorStore = create<CalculatorState>((set) => ({
  input: DEFAULT_INPUT,
  output: initialOutput,
  interactionCount: 0,
  advancedOpen: false,

  setAdvancedOpen: (open) => set({ advancedOpen: open }),

  updateInput: (key, value) =>
    set((state) => {
      const newInput = { ...state.input, [key]: value };
      return {
        input: newInput,
        output: calculateFIRE(newInput),
        interactionCount: state.interactionCount + 1,
      };
    }),

  setInput: (input) =>
    set({ input, output: calculateFIRE(input) }),

  resetToDefaults: () =>
    set({ input: DEFAULT_INPUT, output: initialOutput }),
}));
