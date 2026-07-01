import { describe, it, expect } from 'vitest';
import {
  calculateHealthcareBridge,
  MEDICARE_ELIGIBILITY_AGE,
  type HealthcareBridgeInput,
} from '../healthcare-bridge';

// ──────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────
describe('MEDICARE_ELIGIBILITY_AGE', () => {
  it('is exactly 65 (US law, Social Security Act §226)', () => {
    expect(MEDICARE_ELIGIBILITY_AGE).toBe(65);
  });
});

// ──────────────────────────────────────────────
// Normal cases
// ──────────────────────────────────────────────
describe('calculateHealthcareBridge — normal cases', () => {
  it('computes 10-year bridge with no growth', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 30,
      retirementAge: 55,
      annualPremium: 12000,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(10);
    expect(result.result.totalEstimatedCost).toBe(120000); // 12000 × 10
    expect(result.result.medicareEligibilityAge).toBe(65);
    expect(result.result.noGapNeeded).toBe(false);
  });

  it('computes 15-year bridge with 5% annual growth (geometric series)', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 40,
      retirementAge: 50,
      annualPremium: 10000,
      annualGrowthRate: 0.05,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(15);
    // Geometric: 10000 × ((1.05^15 - 1) / 0.05) ≈ 214,928
    const expected = Math.round(10000 * (Math.pow(1.05, 15) - 1) / 0.05);
    expect(result.result.totalEstimatedCost).toBe(expected);
  });

  it('returns noGapNeeded=false and correct bridge for retirement at 50', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 45,
      retirementAge: 50,
      annualPremium: 8000,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(15);
    expect(result.result.noGapNeeded).toBe(false);
  });

  it('handles zero premium (no cost)', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 30,
      retirementAge: 40,
      annualPremium: 0,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.totalEstimatedCost).toBe(0);
    expect(result.result.bridgeYears).toBe(25);
  });

  it('handles 0% growth rate explicitly (same as no growth)', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 30,
      retirementAge: 60,
      annualPremium: 6000,
      annualGrowthRate: 0,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.totalEstimatedCost).toBe(30000); // 6000 × 5
  });
});

// ──────────────────────────────────────────────
// Boundary: retire >= 65 → 0 years / no cost
// ──────────────────────────────────────────────
describe('calculateHealthcareBridge — boundary: retire at or after 65', () => {
  it('retirementAge === 65 → bridgeYears=0, noGapNeeded=true, cost=0', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 40,
      retirementAge: 65,
      annualPremium: 15000,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(0);
    expect(result.result.totalEstimatedCost).toBe(0);
    expect(result.result.noGapNeeded).toBe(true);
  });

  it('retirementAge > 65 → bridgeYears=0, noGapNeeded=true, cost=0', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 60,
      retirementAge: 70,
      annualPremium: 20000,
      annualGrowthRate: 0.05,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(0);
    expect(result.result.totalEstimatedCost).toBe(0);
    expect(result.result.noGapNeeded).toBe(true);
  });

  it('retirementAge === 64 → bridgeYears=1', () => {
    const input: HealthcareBridgeInput = {
      currentAge: 50,
      retirementAge: 64,
      annualPremium: 12000,
    };
    const result = calculateHealthcareBridge(input);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(1);
    expect(result.result.totalEstimatedCost).toBe(12000);
  });
});

// ──────────────────────────────────────────────
// Validation: negative / invalid inputs rejected
// ──────────────────────────────────────────────
describe('calculateHealthcareBridge — input validation', () => {
  it('rejects negative currentAge', () => {
    const result = calculateHealthcareBridge({
      currentAge: -1,
      retirementAge: 55,
      annualPremium: 10000,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.field === 'currentAge')).toBe(true);
  });

  it('rejects negative annualPremium', () => {
    const result = calculateHealthcareBridge({
      currentAge: 30,
      retirementAge: 55,
      annualPremium: -500,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.field === 'annualPremium')).toBe(true);
  });

  it('rejects retirementAge < currentAge', () => {
    const result = calculateHealthcareBridge({
      currentAge: 50,
      retirementAge: 40,
      annualPremium: 10000,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.field === 'retirementAge')).toBe(true);
  });

  it('rejects NaN currentAge', () => {
    const result = calculateHealthcareBridge({
      currentAge: NaN,
      retirementAge: 55,
      annualPremium: 10000,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects NaN annualPremium', () => {
    const result = calculateHealthcareBridge({
      currentAge: 30,
      retirementAge: 55,
      annualPremium: NaN,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects growth rate below -1', () => {
    const result = calculateHealthcareBridge({
      currentAge: 30,
      retirementAge: 55,
      annualPremium: 10000,
      annualGrowthRate: -2,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.field === 'annualGrowthRate')).toBe(true);
  });

  it('rejects Infinity for annualPremium', () => {
    const result = calculateHealthcareBridge({
      currentAge: 30,
      retirementAge: 55,
      annualPremium: Infinity,
    });
    expect(result.ok).toBe(false);
  });

  it('rejects currentAge > 120', () => {
    const result = calculateHealthcareBridge({
      currentAge: 150,
      retirementAge: 160,
      annualPremium: 10000,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.some((e) => e.field === 'currentAge')).toBe(true);
  });

  it('allows retirementAge === currentAge (just retired today)', () => {
    const result = calculateHealthcareBridge({
      currentAge: 45,
      retirementAge: 45,
      annualPremium: 12000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(20);
  });
});

// ──────────────────────────────────────────────
// Edge: large but valid premium
// ──────────────────────────────────────────────
describe('calculateHealthcareBridge — large values', () => {
  it('handles large but valid premium without overflow', () => {
    const result = calculateHealthcareBridge({
      currentAge: 30,
      retirementAge: 40,
      annualPremium: 100000, // $100k/yr
      annualGrowthRate: 0.1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.result.bridgeYears).toBe(25);
    expect(result.result.totalEstimatedCost).toBeGreaterThan(0);
    expect(Number.isFinite(result.result.totalEstimatedCost)).toBe(true);
  });
});
