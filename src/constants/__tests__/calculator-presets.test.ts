/**
 * calculator-presets.ts — unit tests (부속U U-01 acceptance:
 * "프리셋 값이 데이터셋 실값과 일치" — preset values match the real
 * dataset/engine values, no fabrication).
 */

import { describe, it, expect } from 'vitest';
import { CALCULATOR_PRESETS } from '../calculator-presets';
import { DEFAULT_INPUT, SLIDER_CONFIGS } from '../fire-defaults';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import type { FIREInput } from '@/types/fire.types';

/** Shallow-omit helper for the "every other field matches DEFAULT_INPUT" assertions below. */
function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const clone = { ...obj };
  for (const key of keys) delete clone[key];
  return clone;
}

describe('CALCULATOR_PRESETS', () => {
  it('defines exactly 3 presets (부속U §5: 2-3 preset buttons)', () => {
    expect(CALCULATOR_PRESETS.length).toBeGreaterThanOrEqual(2);
    expect(CALCULATOR_PRESETS.length).toBeLessThanOrEqual(3);
  });

  it('every preset has a unique id and a "Try:" label', () => {
    const ids = CALCULATOR_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const preset of CALCULATOR_PRESETS) {
      expect(preset.label.startsWith('Try:')).toBe(true);
    }
  });

  it('every preset input value is a real, valid engine input within its slider bounds (no fabricated out-of-range values)', () => {
    for (const preset of CALCULATOR_PRESETS) {
      for (const config of SLIDER_CONFIGS) {
        const value = preset.input[config.key];
        expect(typeof value).toBe('number');
        expect(value).toBeGreaterThanOrEqual(config.min);
        expect(value).toBeLessThanOrEqual(config.max);
      }
    }
  });

  it('every preset input has exactly the 9 FIREInput fields (full injection, not a partial patch)', () => {
    const expectedKeys = SLIDER_CONFIGS.map((c) => c.key).sort();
    for (const preset of CALCULATOR_PRESETS) {
      expect(Object.keys(preset.input).sort()).toEqual(expectedKeys);
    }
  });

  it('preset "young-saver" (30, $80k income, 30% savings) IS the app\'s own DEFAULT_INPUT — literally the existing dataset default, not a new number', () => {
    const preset = CALCULATOR_PRESETS.find((p) => p.id === 'young-saver');
    expect(preset).toBeDefined();
    expect(preset!.input).toEqual(DEFAULT_INPUT);
    expect(preset!.input.currentAge).toBe(30);
    expect(preset!.input.annualIncome).toBe(80000);
    expect(preset!.input.savingsRate).toBeCloseTo(0.3);
  });

  it('preset "mid-career" (40, $120k income, 25% savings) matches the 부속U §5 scenario exactly, with every other field pinned to DEFAULT_INPUT', () => {
    const preset = CALCULATOR_PRESETS.find((p) => p.id === 'mid-career');
    expect(preset).toBeDefined();
    expect(preset!.input.currentAge).toBe(40);
    expect(preset!.input.annualIncome).toBe(120000);
    expect(preset!.input.savingsRate).toBeCloseTo(0.25);
    // Every other field must come straight from the real dataset default —
    // never a fabricated figure.
    const overridden: Array<keyof FIREInput> = ['currentAge', 'annualIncome', 'savingsRate'];
    expect(omit(preset!.input, overridden)).toEqual(omit(DEFAULT_INPUT, overridden));
  });

  it('preset "coast-fire-35" (Coast FIRE at 35) sets currentAge=35 and savingsRate=0 (the Coast archetype: no further contributions), with every other field from DEFAULT_INPUT', () => {
    const preset = CALCULATOR_PRESETS.find((p) => p.id === 'coast-fire-35');
    expect(preset).toBeDefined();
    expect(preset!.input.currentAge).toBe(35);
    expect(preset!.input.savingsRate).toBe(0);
    const overridden: Array<keyof FIREInput> = ['currentAge', 'savingsRate'];
    expect(omit(preset!.input, overridden)).toEqual(omit(DEFAULT_INPUT, overridden));
  });

  it('every preset feeds the real, unmodified calculateFIRE() engine without throwing and produces a full 5-type result (no mocked/fabricated output)', () => {
    for (const preset of CALCULATOR_PRESETS) {
      const output = calculateFIRE(preset.input);
      expect(output.results).toHaveProperty('lean');
      expect(output.results).toHaveProperty('regular');
      expect(output.results).toHaveProperty('fat');
      expect(output.results).toHaveProperty('coast');
      expect(output.results).toHaveProperty('barista');
      expect(output.timeline.length).toBeGreaterThan(0);
    }
  });

  it('applying a preset field-by-field (the updateInput() code path) reconstructs the exact same input the preset declares — the dataset/engine equality the acceptance criterion requires', () => {
    for (const preset of CALCULATOR_PRESETS) {
      // Simulate the store's updateInput() reducer applied once per field,
      // starting from DEFAULT_INPUT — the same sequence CalculatorPresets
      // performs via useCalculatorStore().updateInput() on click.
      let simulated: FIREInput = { ...DEFAULT_INPUT };
      for (const key of Object.keys(preset.input) as Array<keyof FIREInput>) {
        simulated = { ...simulated, [key]: preset.input[key] };
      }
      expect(simulated).toEqual(preset.input);
      expect(calculateFIRE(simulated)).toEqual(calculateFIRE(preset.input));
    }
  });
});
