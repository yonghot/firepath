import { describe, it, expect } from 'vitest';
import { optimizePortfolio, ASSET_CLASSES } from '../portfolio-optimizer';
import { calculateFIRE } from '../fire-calculator';
import type { FIREInput } from '@/types/fire.types';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';

const defaultInput: FIREInput = { ...DEFAULT_INPUT };
const defaultFIREResults = calculateFIRE(defaultInput).results;

describe('optimizePortfolio', () => {
  it('returns all 3 risk profiles', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    expect(result.portfolios).toHaveLength(3);
    const profiles = result.portfolios.map((p) => p.profile);
    expect(profiles).toContain('conservative');
    expect(profiles).toContain('moderate');
    expect(profiles).toContain('aggressive');
  });

  it('recommends a valid risk profile', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    expect(['conservative', 'moderate', 'aggressive']).toContain(result.recommended);
  });

  it('portfolio weights sum to 1.0 for each profile', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    for (const portfolio of result.portfolios) {
      const totalWeight = portfolio.allocations.reduce((sum, a) => sum + a.weight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 5);
    }
  });

  it('aggressive has higher expected return than conservative', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    const conservative = result.portfolios.find((p) => p.profile === 'conservative')!;
    const aggressive = result.portfolios.find((p) => p.profile === 'aggressive')!;
    expect(aggressive.expectedReturn).toBeGreaterThan(conservative.expectedReturn);
  });

  it('aggressive has higher volatility than conservative', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    const conservative = result.portfolios.find((p) => p.profile === 'conservative')!;
    const aggressive = result.portfolios.find((p) => p.profile === 'aggressive')!;
    expect(aggressive.volatility).toBeGreaterThan(conservative.volatility);
  });

  it('sharpe ratios are positive for all profiles', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    for (const portfolio of result.portfolios) {
      expect(portfolio.sharpeRatio).toBeGreaterThan(0);
    }
  });

  it('projected growth starts at currentAge with currentNetWorth', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    expect(result.projectedGrowth[0].age).toBe(defaultInput.currentAge);
    expect(result.projectedGrowth[0].conservative).toBe(defaultInput.currentNetWorth);
    expect(result.projectedGrowth[0].moderate).toBe(defaultInput.currentNetWorth);
    expect(result.projectedGrowth[0].aggressive).toBe(defaultInput.currentNetWorth);
  });

  it('projected growth aggressive >= moderate >= conservative over time', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    const lastEntry = result.projectedGrowth[result.projectedGrowth.length - 1];
    expect(lastEntry.aggressive).toBeGreaterThanOrEqual(lastEntry.moderate);
    expect(lastEntry.moderate).toBeGreaterThanOrEqual(lastEntry.conservative);
  });

  it('uses correct number of asset classes', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    for (const portfolio of result.portfolios) {
      expect(portfolio.allocations).toHaveLength(ASSET_CLASSES.length);
    }
  });

  it('yearsToFIRE has entries for all 5 FIRE types', () => {
    const result = optimizePortfolio(defaultInput, defaultFIREResults);
    expect(result.yearsToFIRE).toHaveProperty('lean');
    expect(result.yearsToFIRE).toHaveProperty('regular');
    expect(result.yearsToFIRE).toHaveProperty('fat');
    expect(result.yearsToFIRE).toHaveProperty('coast');
    expect(result.yearsToFIRE).toHaveProperty('barista');
  });

  it('recommends aggressive for young investor with long horizon', () => {
    const youngInput: FIREInput = { ...defaultInput, currentAge: 25 };
    const youngResults = calculateFIRE(youngInput).results;
    const result = optimizePortfolio(youngInput, youngResults);
    expect(result.recommended).toBe('aggressive');
  });

  it('recommends conservative/moderate for near-retirement investor', () => {
    const nearRetire: FIREInput = { ...defaultInput, currentAge: 55, retirementAge: 60, currentNetWorth: 800000 };
    const nearResults = calculateFIRE(nearRetire).results;
    const result = optimizePortfolio(nearRetire, nearResults);
    expect(['conservative', 'moderate']).toContain(result.recommended);
  });
});
