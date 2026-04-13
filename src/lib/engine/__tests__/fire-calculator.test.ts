import { describe, it, expect } from 'vitest';
import { calculateFIRE } from '../fire-calculator';
import type { FIREInput } from '@/types/fire.types';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS, MAX_SIMULATION_AGE } from '@/constants/fire-defaults';

const defaultInput: FIREInput = { ...DEFAULT_INPUT };

describe('calculateFIRE', () => {
  it('returns results for all 5 FIRE types', () => {
    const output = calculateFIRE(defaultInput);
    expect(output.results).toHaveProperty('lean');
    expect(output.results).toHaveProperty('regular');
    expect(output.results).toHaveProperty('fat');
    expect(output.results).toHaveProperty('coast');
    expect(output.results).toHaveProperty('barista');
  });

  it('calculates correct FIRE targets using 4% rule', () => {
    const output = calculateFIRE(defaultInput);
    const { annualExpenses, safeWithdrawalRate } = defaultInput;

    expect(output.results.lean.targetAmount).toBe(
      Math.round((annualExpenses * FIRE_MULTIPLIERS.lean) / safeWithdrawalRate)
    );
    expect(output.results.regular.targetAmount).toBe(
      Math.round((annualExpenses * FIRE_MULTIPLIERS.regular) / safeWithdrawalRate)
    );
    expect(output.results.fat.targetAmount).toBe(
      Math.round((annualExpenses * FIRE_MULTIPLIERS.fat) / safeWithdrawalRate)
    );
    expect(output.results.barista.targetAmount).toBe(
      Math.round((annualExpenses * FIRE_MULTIPLIERS.barista) / safeWithdrawalRate)
    );
  });

  it('generates timeline from currentAge to MAX_SIMULATION_AGE', () => {
    const output = calculateFIRE(defaultInput);
    expect(output.timeline.length).toBe(MAX_SIMULATION_AGE - defaultInput.currentAge + 1);
    expect(output.timeline[0].age).toBe(defaultInput.currentAge);
    expect(output.timeline[output.timeline.length - 1].age).toBe(MAX_SIMULATION_AGE);
  });

  it('has non-decreasing net worth in timeline (positive savings + return)', () => {
    const output = calculateFIRE(defaultInput);
    for (let i = 1; i < output.timeline.length; i++) {
      expect(output.timeline[i].netWorth).toBeGreaterThanOrEqual(output.timeline[i - 1].netWorth);
    }
  });

  it('first timeline entry has no savings or investment growth', () => {
    const output = calculateFIRE(defaultInput);
    expect(output.timeline[0].annualSavings).toBe(0);
    expect(output.timeline[0].investmentGrowth).toBe(0);
    expect(output.timeline[0].netWorth).toBe(defaultInput.currentNetWorth);
  });

  it('FIRE targets are ordered: barista < lean < regular < fat', () => {
    const output = calculateFIRE(defaultInput);
    expect(output.results.barista.targetAmount).toBeLessThan(output.results.lean.targetAmount);
    expect(output.results.lean.targetAmount).toBeLessThan(output.results.regular.targetAmount);
    expect(output.results.regular.targetAmount).toBeLessThan(output.results.fat.targetAmount);
  });

  it('reach ages are ordered: barista <= lean <= regular <= fat (when all reachable)', () => {
    const output = calculateFIRE(defaultInput);
    const ages = [
      output.results.barista.reachAge,
      output.results.lean.reachAge,
      output.results.regular.reachAge,
      output.results.fat.reachAge,
    ];
    for (let i = 1; i < ages.length; i++) {
      if (ages[i] !== null && ages[i - 1] !== null) {
        expect(ages[i]!).toBeGreaterThanOrEqual(ages[i - 1]!);
      }
    }
  });

  it('calculates monthly passive income correctly', () => {
    const output = calculateFIRE(defaultInput);
    for (const type of ['lean', 'regular', 'fat', 'barista'] as const) {
      const result = output.results[type];
      expect(result.monthlyPassiveIncome).toBe(
        Math.round((result.targetAmount * defaultInput.safeWithdrawalRate) / 12)
      );
    }
  });

  it('coast FIRE target is less than regular target', () => {
    const output = calculateFIRE(defaultInput);
    expect(output.results.coast.targetAmount).toBeLessThan(output.results.regular.targetAmount);
  });

  it('coast FIRE reachAge is before retirementAge', () => {
    const output = calculateFIRE(defaultInput);
    if (output.results.coast.reachAge !== null) {
      expect(output.results.coast.reachAge).toBeLessThan(defaultInput.retirementAge);
    }
  });

  it('handles zero net worth input', () => {
    const input = { ...defaultInput, currentNetWorth: 0 };
    const output = calculateFIRE(input);
    expect(output.timeline[0].netWorth).toBe(0);
    expect(output.results.regular.targetAmount).toBeGreaterThan(0);
  });

  it('handles high savings rate', () => {
    const input = { ...defaultInput, savingsRate: 0.8 };
    const output = calculateFIRE(input);
    // With 80% savings, should reach FIRE faster
    const defaultOutput = calculateFIRE(defaultInput);
    if (output.results.regular.reachAge !== null && defaultOutput.results.regular.reachAge !== null) {
      expect(output.results.regular.reachAge).toBeLessThanOrEqual(defaultOutput.results.regular.reachAge);
    }
  });

  it('uses real return (Fisher equation)', () => {
    const output = calculateFIRE(defaultInput);
    const realReturn = (1 + defaultInput.expectedReturn) / (1 + defaultInput.inflation) - 1;
    // Second year: netWorth should grow by realReturn + savings
    const expectedNW = defaultInput.currentNetWorth * (1 + realReturn) + defaultInput.annualIncome * defaultInput.savingsRate;
    expect(output.timeline[1].netWorth).toBe(Math.round(expectedNW));
  });
});
