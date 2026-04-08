'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FIREInput, FIREOutput, Scenario } from '@/types/fire.types';
import { calculateFIRE } from '@/lib/engine/fire-calculator';

const MAX_FREE_SCENARIOS = 2;

interface ScenarioState {
  scenarios: Scenario[];
  compareIds: [string, string] | null;
  addScenario: (name: string, input: FIREInput) => boolean;
  removeScenario: (id: string) => void;
  renameScenario: (id: string, name: string) => void;
  setCompare: (ids: [string, string] | null) => void;
  canAddScenario: () => boolean;
}

export const useScenarioStore = create<ScenarioState>()(
  persist(
    (set, get) => ({
      scenarios: [],
      compareIds: null,

      addScenario: (name, input) => {
        if (get().scenarios.length >= MAX_FREE_SCENARIOS) return false;
        const scenario: Scenario = {
          id: crypto.randomUUID(),
          name,
          input: { ...input },
          output: calculateFIRE(input),
          createdAt: Date.now(),
        };
        set((state) => ({
          scenarios: [...state.scenarios, scenario],
        }));
        return true;
      },

      removeScenario: (id) =>
        set((state) => {
          const scenarios = state.scenarios.filter((s) => s.id !== id);
          const compareIds = state.compareIds;
          const newCompare =
            compareIds && (compareIds[0] === id || compareIds[1] === id)
              ? null
              : compareIds;
          return { scenarios, compareIds: newCompare };
        }),

      renameScenario: (id, name) =>
        set((state) => ({
          scenarios: state.scenarios.map((s) =>
            s.id === id ? { ...s, name } : s
          ),
        })),

      setCompare: (ids) => set({ compareIds: ids }),

      canAddScenario: () => get().scenarios.length < MAX_FREE_SCENARIOS,
    }),
    {
      name: 'firepath-scenarios',
      partialize: (state) => ({
        scenarios: state.scenarios,
      }),
    }
  )
);
