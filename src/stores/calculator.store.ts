'use client';

import { create } from 'zustand';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { calculateFIRE } from '@/lib/engine/fire-calculator';

interface CalculatorState {
  input: FIREInput;
  output: FIREOutput;
  updateInput: <K extends keyof FIREInput>(key: K, value: FIREInput[K]) => void;
  setInput: (input: FIREInput) => void;
  resetToDefaults: () => void;
}

const initialOutput = calculateFIRE(DEFAULT_INPUT);

export const useCalculatorStore = create<CalculatorState>((set) => ({
  input: DEFAULT_INPUT,
  output: initialOutput,

  updateInput: (key, value) =>
    set((state) => {
      const newInput = { ...state.input, [key]: value };
      return { input: newInput, output: calculateFIRE(newInput) };
    }),

  setInput: (input) =>
    set({ input, output: calculateFIRE(input) }),

  resetToDefaults: () =>
    set({ input: DEFAULT_INPUT, output: initialOutput }),
}));
