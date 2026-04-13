import { describe, it, expect } from 'vitest';
import { runMonteCarlo } from '../monte-carlo';
import type { FIREInput } from '@/types/fire.types';
import { DEFAULT_INPUT, MAX_SIMULATION_AGE } from '@/constants/fire-defaults';

const defaultInput: FIREInput = { ...DEFAULT_INPUT };

describe('runMonteCarlo', () => {
  it('returns percentiles, successRates, and medianReachAge', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    expect(result).toHaveProperty('percentiles');
    expect(result).toHaveProperty('successRates');
    expect(result).toHaveProperty('medianReachAge');
  });

  it('generates correct number of percentile entries', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    const expectedYears = MAX_SIMULATION_AGE - defaultInput.currentAge + 1;
    expect(result.percentiles.length).toBe(expectedYears);
  });

  it('percentile values are ordered: p10 <= p25 <= p50 <= p75 <= p90', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    for (const p of result.percentiles) {
      expect(p.p10).toBeLessThanOrEqual(p.p25);
      expect(p.p25).toBeLessThanOrEqual(p.p50);
      expect(p.p50).toBeLessThanOrEqual(p.p75);
      expect(p.p75).toBeLessThanOrEqual(p.p90);
    }
  });

  it('success rates are between 0 and 1', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    for (const type of ['lean', 'regular', 'fat', 'coast', 'barista'] as const) {
      expect(result.successRates[type]).toBeGreaterThanOrEqual(0);
      expect(result.successRates[type]).toBeLessThanOrEqual(1);
    }
  });

  it('lean success rate >= regular >= fat (easier targets have higher success)', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 500, volatility: 0.15 });
    expect(result.successRates.lean).toBeGreaterThanOrEqual(result.successRates.regular);
    expect(result.successRates.regular).toBeGreaterThanOrEqual(result.successRates.fat);
  });

  it('is deterministic with seed 42', () => {
    const result1 = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    const result2 = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    expect(result1.percentiles[10].p50).toBe(result2.percentiles[10].p50);
    expect(result1.successRates.regular).toBe(result2.successRates.regular);
  });

  it('higher volatility widens the percentile fan', () => {
    const lowVol = runMonteCarlo(defaultInput, { simulations: 200, volatility: 0.05 });
    const highVol = runMonteCarlo(defaultInput, { simulations: 200, volatility: 0.25 });
    // At a later age, spread should be wider with higher volatility
    const lastIdx = lowVol.percentiles.length - 1;
    const spreadLow = lowVol.percentiles[lastIdx].p90 - lowVol.percentiles[lastIdx].p10;
    const spreadHigh = highVol.percentiles[lastIdx].p90 - highVol.percentiles[lastIdx].p10;
    expect(spreadHigh).toBeGreaterThan(spreadLow);
  });

  it('first percentile entry starts at currentAge with currentNetWorth', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 100, volatility: 0.15 });
    expect(result.percentiles[0].age).toBe(defaultInput.currentAge);
    // All simulations start at same net worth, so all percentiles should be equal at age 0
    expect(result.percentiles[0].p10).toBe(defaultInput.currentNetWorth);
    expect(result.percentiles[0].p90).toBe(defaultInput.currentNetWorth);
  });

  it('medianReachAge for easier targets is earlier or equal', () => {
    const result = runMonteCarlo(defaultInput, { simulations: 500, volatility: 0.15 });
    if (result.medianReachAge.lean !== null && result.medianReachAge.regular !== null) {
      expect(result.medianReachAge.lean).toBeLessThanOrEqual(result.medianReachAge.regular);
    }
    if (result.medianReachAge.regular !== null && result.medianReachAge.fat !== null) {
      expect(result.medianReachAge.regular).toBeLessThanOrEqual(result.medianReachAge.fat);
    }
  });

  it('uses default config when none provided', () => {
    const result = runMonteCarlo(defaultInput);
    // Should run without error with 1000 simulations
    expect(result.percentiles.length).toBeGreaterThan(0);
    expect(result.successRates.regular).toBeGreaterThanOrEqual(0);
  });
});
