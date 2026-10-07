import { describe, expect, it } from 'vitest';
import { CALCULATOR_PRESETS } from '@/constants/calculator-presets';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { resolveScenario } from '@/lib/engine/example-scenarios';
import type { FIREInput } from '@/types/fire.types';

const KEYS = Object.keys(DEFAULT_INPUT) as Array<keyof FIREInput>;
const defaults = calculateFIRE(DEFAULT_INPUT).results.regular;

describe('UX P0-1: every "Try:" preset visibly changes the calculator', () => {
  for (const preset of CALCULATOR_PRESETS) {
    it(`"${preset.label}" differs from the default inputs in at least one field`, () => {
      expect(KEYS.some((key) => preset.input[key] !== DEFAULT_INPUT[key])).toBe(true);
    });

    it(`"${preset.label}" moves the Regular FIRE answer away from the default example`, () => {
      const regular = calculateFIRE(preset.input).results.regular;
      expect(regular.targetAmount !== defaults.targetAmount || regular.reachAge !== defaults.reachAge).toBe(true);
    });

    it(`"${preset.label}" reads as a labelled preset example, not as the default inputs`, () => {
      expect(resolveScenario(preset.input).kind).toBe('preset');
    });
  }

  it('a label that quotes age, income and savings quotes the values the preset really sets', () => {
    const quoting = CALCULATOR_PRESETS.map((preset) => ({
      preset,
      match: preset.label.match(/^Try: (\d+), \$(\d+)k income, (\d+)% savings$/),
    })).filter((entry) => entry.match);
    expect(quoting.length).toBeGreaterThanOrEqual(2);
    for (const { preset, match } of quoting) {
      expect(preset.input.currentAge, preset.label).toBe(Number(match![1]));
      expect(preset.input.annualIncome, preset.label).toBe(Number(match![2]) * 1000);
      expect(Math.round(preset.input.savingsRate * 100), preset.label).toBe(Number(match![3]));
    }
  });
});
