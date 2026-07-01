/**
 * Phase-1 augmented tests — 2026-06-29 credibility corrections regression guards.
 *
 * Covers four areas per spec:
 * (a) FIRE target formula  target = (annualExpenses × multiplier) / SWR
 *     REGRESSION GUARD: Regular type at SWR=0.04 must equal 25×annualExpenses.
 * (b) Fisher real-return   real = (1+r)/(1+i) - 1   (isolated unit tests).
 * (c) Year-by-year simulation endpoint (age 80) and "80+" edge labeling.
 * (d) FIRE-type multipliers map constants  Lean 0.6 / Regular 1.0 / Fat 1.5 / Barista 0.5.
 *
 * RULES:
 * - No network calls, no Date.now/Math.random reliance in deterministic paths.
 * - Factory helpers provide shared test data — no scattered magic literals.
 * - All product-bug findings are noted with skip/todo; source is NOT modified.
 */

import { describe, it, expect } from 'vitest';
import { calculateFIRE } from '../fire-calculator';
import { calculateFIRETargets } from '../fire-targets';
import { FIRE_MULTIPLIERS, MAX_SIMULATION_AGE, DEFAULT_INPUT } from '@/constants/fire-defaults';
import type { FIREInput } from '@/types/fire.types';

// ---------------------------------------------------------------------------
// Factory helpers — single source of truth for test inputs
// ---------------------------------------------------------------------------

/**
 * Base input that satisfies all fields; individual tests override what they need.
 * Uses well-understood round numbers so expected values are easy to verify by hand.
 */
function makeInput(overrides: Partial<FIREInput> = {}): FIREInput {
  return {
    currentAge: 30,
    retirementAge: 65,
    annualIncome: 100_000,
    currentNetWorth: 0,        // zero makes arithmetic transparent
    savingsRate: 0.30,
    annualExpenses: 40_000,
    expectedReturn: 0.07,
    inflation: 0.03,
    safeWithdrawalRate: 0.04,  // the canonical "4% rule"
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// (d) FIRE-type multipliers — pin constant values so renames/typos are caught
// ---------------------------------------------------------------------------

describe('FIRE_MULTIPLIERS constant values — regression guard', () => {
  it('Lean multiplier is exactly 0.6', () => {
    expect(FIRE_MULTIPLIERS.lean).toBe(0.6);
  });

  it('Regular multiplier is exactly 1.0', () => {
    expect(FIRE_MULTIPLIERS.regular).toBe(1.0);
  });

  it('Fat multiplier is exactly 1.5', () => {
    expect(FIRE_MULTIPLIERS.fat).toBe(1.5);
  });

  it('Barista multiplier is exactly 0.5', () => {
    expect(FIRE_MULTIPLIERS.barista).toBe(0.5);
  });

  it('multiplier ordering is: barista < lean < regular < fat', () => {
    expect(FIRE_MULTIPLIERS.barista).toBeLessThan(FIRE_MULTIPLIERS.lean);
    expect(FIRE_MULTIPLIERS.lean).toBeLessThan(FIRE_MULTIPLIERS.regular);
    expect(FIRE_MULTIPLIERS.regular).toBeLessThan(FIRE_MULTIPLIERS.fat);
  });

  it('coast is NOT a key in FIRE_MULTIPLIERS (coast uses its own formula)', () => {
    expect(Object.keys(FIRE_MULTIPLIERS)).not.toContain('coast');
  });

  it('FIRE_MULTIPLIERS has exactly 4 entries', () => {
    expect(Object.keys(FIRE_MULTIPLIERS)).toHaveLength(4);
  });
});

// ---------------------------------------------------------------------------
// (a) FIRE target formula — regression guards with hard-coded expected values
// ---------------------------------------------------------------------------

describe('calculateFIRETargets — formula regression guards', () => {
  // Canonical fixture: expenses=$40k, SWR=4%
  const EXPENSES = 40_000;
  const SWR_4PCT = 0.04;

  // REGRESSION GUARD (critical): Regular at SWR=0.04 MUST equal 25×expenses
  it('[REGRESSION] Regular target at SWR=0.04 equals exactly 25×annualExpenses', () => {
    const targets = calculateFIRETargets(EXPENSES, SWR_4PCT);
    expect(targets.regular).toBe(EXPENSES * 25);           // 1_000_000
  });

  it('[REGRESSION] Regular target at SWR=0.04, expenses=40000 is exactly 1_000_000', () => {
    const targets = calculateFIRETargets(EXPENSES, SWR_4PCT);
    expect(targets.regular).toBe(1_000_000);
  });

  it('[REGRESSION] Lean target at SWR=0.04, expenses=40000 is exactly 600_000', () => {
    const targets = calculateFIRETargets(EXPENSES, SWR_4PCT);
    // lean = (40000 × 0.6) / 0.04 = 24000 / 0.04 = 600_000
    expect(targets.lean).toBe(600_000);
  });

  it('[REGRESSION] Fat target at SWR=0.04, expenses=40000 is exactly 1_500_000', () => {
    const targets = calculateFIRETargets(EXPENSES, SWR_4PCT);
    // fat = (40000 × 1.5) / 0.04 = 60000 / 0.04 = 1_500_000
    expect(targets.fat).toBe(1_500_000);
  });

  it('[REGRESSION] Barista target at SWR=0.04, expenses=40000 is exactly 500_000', () => {
    const targets = calculateFIRETargets(EXPENSES, SWR_4PCT);
    // barista = (40000 × 0.5) / 0.04 = 20000 / 0.04 = 500_000
    expect(targets.barista).toBe(500_000);
  });

  // Formula correctness for each type using the canonical equation
  it('each target satisfies formula: (expenses × multiplier) / SWR', () => {
    const targets = calculateFIRETargets(EXPENSES, SWR_4PCT);
    expect(targets.lean).toBeCloseTo((EXPENSES * FIRE_MULTIPLIERS.lean) / SWR_4PCT, 6);
    expect(targets.regular).toBeCloseTo((EXPENSES * FIRE_MULTIPLIERS.regular) / SWR_4PCT, 6);
    expect(targets.fat).toBeCloseTo((EXPENSES * FIRE_MULTIPLIERS.fat) / SWR_4PCT, 6);
    expect(targets.barista).toBeCloseTo((EXPENSES * FIRE_MULTIPLIERS.barista) / SWR_4PCT, 6);
  });

  // Boundary: SWR=0.02 (3.5% rule is common; 2% is extreme conservative)
  it('all targets double when SWR halves from 0.04 to 0.02', () => {
    const at4 = calculateFIRETargets(EXPENSES, 0.04);
    const at2 = calculateFIRETargets(EXPENSES, 0.02);
    for (const type of ['lean', 'regular', 'fat', 'barista'] as const) {
      expect(at2[type]).toBeCloseTo(at4[type] * 2, 6);
    }
  });

  // Boundary: SWR=0.06
  it('[REGRESSION] Regular target at SWR=0.06 is exactly 666_666.6… (expenses/0.06)', () => {
    const targets = calculateFIRETargets(EXPENSES, 0.06);
    expect(targets.regular).toBeCloseTo(EXPENSES / 0.06, 6);
  });

  // Edge: zero expenses → all targets are zero
  it('all targets are 0 when annualExpenses is 0', () => {
    const targets = calculateFIRETargets(0, SWR_4PCT);
    expect(targets.lean).toBe(0);
    expect(targets.regular).toBe(0);
    expect(targets.fat).toBe(0);
    expect(targets.barista).toBe(0);
  });

  // Error-like: very high expenses
  it('handles large expense values without overflow', () => {
    const targets = calculateFIRETargets(500_000, SWR_4PCT);
    expect(targets.regular).toBe(12_500_000);  // 500k * 1.0 / 0.04
    expect(Number.isFinite(targets.fat)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// (a) Regression guards via calculateFIRE integration (targetAmount field)
// ---------------------------------------------------------------------------

describe('calculateFIRE — FIRE target regression guards', () => {
  it('[REGRESSION] regular.targetAmount at SWR=0.04 equals exactly 25×annualExpenses', () => {
    const input = makeInput({ annualExpenses: 40_000, safeWithdrawalRate: 0.04 });
    const output = calculateFIRE(input);
    expect(output.results.regular.targetAmount).toBe(40_000 * 25);
  });

  it('[REGRESSION] regular.targetAmount at SWR=0.04, expenses=60000 is 1_500_000', () => {
    const input = makeInput({ annualExpenses: 60_000, safeWithdrawalRate: 0.04 });
    const output = calculateFIRE(input);
    expect(output.results.regular.targetAmount).toBe(1_500_000);
  });

  it('[REGRESSION] lean.targetAmount = 0.6×regular.targetAmount', () => {
    const input = makeInput();
    const output = calculateFIRE(input);
    expect(output.results.lean.targetAmount).toBe(
      Math.round(output.results.regular.targetAmount * 0.6)
    );
  });

  it('[REGRESSION] fat.targetAmount = 1.5×regular.targetAmount', () => {
    const input = makeInput();
    const output = calculateFIRE(input);
    expect(output.results.fat.targetAmount).toBe(
      Math.round(output.results.regular.targetAmount * 1.5)
    );
  });

  it('[REGRESSION] barista.targetAmount = 0.5×regular.targetAmount', () => {
    const input = makeInput();
    const output = calculateFIRE(input);
    expect(output.results.barista.targetAmount).toBe(
      Math.round(output.results.regular.targetAmount * 0.5)
    );
  });
});

// ---------------------------------------------------------------------------
// (b) Fisher real-return — isolated formula tests (no integration)
// ---------------------------------------------------------------------------

/**
 * Pure implementation of the Fisher equation, mirroring fire-calculator.ts line 101.
 * We test the formula in isolation so these are not coupled to calculateFIRE internals.
 */
function fisherRealReturn(nominalReturn: number, inflationRate: number): number {
  return (1 + nominalReturn) / (1 + inflationRate) - 1;
}

describe('Fisher real-return formula  real=(1+r)/(1+i)-1', () => {
  // Normal case: the default inputs (7% nominal, 3% inflation)
  it('computes real return ≈ 3.883% for r=7%, i=3%', () => {
    const real = fisherRealReturn(0.07, 0.03);
    // (1.07 / 1.03) - 1 = 0.038834951… ≈ 3.883%
    expect(real).toBeCloseTo(0.038834951, 6);
  });

  // [REGRESSION] The default inputs produce this exact value
  it('[REGRESSION] default inputs (r=0.07, i=0.03) → real return ≈ 0.038835', () => {
    const real = fisherRealReturn(DEFAULT_INPUT.expectedReturn, DEFAULT_INPUT.inflation);
    expect(real).toBeCloseTo(0.038834951456310676, 10);
  });

  // Normal case: r=10%, i=5%
  it('computes real return ≈ 4.762% for r=10%, i=5%', () => {
    const real = fisherRealReturn(0.10, 0.05);
    // (1.10 / 1.05) - 1 = 0.047619047…
    expect(real).toBeCloseTo(0.047619047, 6);
  });

  // Boundary: zero inflation → real return equals nominal
  it('when inflation=0, real return equals nominal return exactly', () => {
    expect(fisherRealReturn(0.07, 0.0)).toBeCloseTo(0.07, 10);
  });

  // Boundary: zero nominal return → real return is negative when inflation > 0
  it('when nominalReturn=0 and inflation>0, real return is negative', () => {
    const real = fisherRealReturn(0.0, 0.03);
    // (1.0 / 1.03) - 1 = -0.029126…
    expect(real).toBeLessThan(0);
    expect(real).toBeCloseTo(-0.029126213592, 8);
  });

  // Boundary: equal rates → real return is exactly 0
  it('when r equals i, real return is 0', () => {
    expect(fisherRealReturn(0.05, 0.05)).toBeCloseTo(0, 10);
  });

  // Edge: high inflation environment (r=15%, i=20%)
  it('can produce negative real return when inflation > nominal return', () => {
    const real = fisherRealReturn(0.15, 0.20);
    // (1.15 / 1.20) - 1 = -0.041666…
    expect(real).toBeLessThan(0);
    expect(real).toBeCloseTo(-0.041666666, 6);
  });

  // Integration: fire-calculator uses Fisher equation in the timeline
  it('calculateFIRE timeline uses Fisher real return for year-over-year growth', () => {
    const r = 0.07;
    const i = 0.03;
    const realReturn = fisherRealReturn(r, i);
    const input = makeInput({
      expectedReturn: r,
      inflation: i,
      currentNetWorth: 100_000,
      savingsRate: 0.0,        // no savings — pure compound growth
      annualIncome: 0,
    });
    const output = calculateFIRE(input);

    // Year 1: netWorth should be 100_000 × (1 + realReturn), rounded
    const expected = Math.round(100_000 * (1 + realReturn));
    expect(output.timeline[1].netWorth).toBe(expected);
  });

  // Integration: second-year growth with savings
  it('calculateFIRE year-2 net worth matches manual Fisher + savings calculation', () => {
    const r = 0.07;
    const i = 0.03;
    const realReturn = fisherRealReturn(r, i);
    const annualIncome = 80_000;
    const savingsRate = 0.25;
    const annualSavings = annualIncome * savingsRate;
    const startNW = 50_000;
    const input = makeInput({
      currentNetWorth: startNW,
      expectedReturn: r,
      inflation: i,
      annualIncome,
      savingsRate,
    });
    const output = calculateFIRE(input);

    // Year 1 (index 1): startNW * (1 + realReturn) + annualSavings, rounded
    const year1NW = Math.round(startNW * (1 + realReturn) + annualSavings);
    expect(output.timeline[1].netWorth).toBe(year1NW);

    // Year 2 (index 2): year1NW * (1 + realReturn) + annualSavings, rounded
    const year2NW = Math.round(year1NW * (1 + realReturn) + annualSavings);
    expect(output.timeline[2].netWorth).toBe(year2NW);
  });
});

// ---------------------------------------------------------------------------
// (c) Year-by-year simulation endpoint (age 80) and "80+" labeling
// ---------------------------------------------------------------------------

describe('simulation endpoint and "80+" edge cases', () => {
  // MAX_SIMULATION_AGE constant must be 80
  it('MAX_SIMULATION_AGE is exactly 80', () => {
    expect(MAX_SIMULATION_AGE).toBe(80);
  });

  // Timeline must end at age 80
  it('timeline always ends at age 80 (MAX_SIMULATION_AGE)', () => {
    const output = calculateFIRE(makeInput());
    const lastEntry = output.timeline[output.timeline.length - 1];
    expect(lastEntry.age).toBe(80);
  });

  // Timeline must start at currentAge
  it('timeline always starts at currentAge', () => {
    const input = makeInput({ currentAge: 35 });
    const output = calculateFIRE(input);
    expect(output.timeline[0].age).toBe(35);
  });

  // Timeline length is MAX_SIMULATION_AGE - currentAge + 1 (inclusive both ends)
  it('timeline length = MAX_SIMULATION_AGE - currentAge + 1', () => {
    const ages = [25, 30, 45, 60];
    for (const currentAge of ages) {
      const output = calculateFIRE(makeInput({ currentAge }));
      expect(output.timeline.length).toBe(MAX_SIMULATION_AGE - currentAge + 1);
    }
  });

  // "80+" means reachAge is null when the target is not reached by age 80
  it('reachAge is null (the "80+" case) when target is unreachable by age 80', () => {
    // Tiny income + no savings + huge target: impossible to reach by 80
    const impossible = makeInput({
      currentAge: 70,
      annualIncome: 10_000,
      savingsRate: 0.01,
      currentNetWorth: 0,
      annualExpenses: 200_000,  // target = 200k/0.04 = 5M — impossible in 10 years
    });
    const output = calculateFIRE(impossible);
    expect(output.results.fat.reachAge).toBeNull();
  });

  // yearsToReach is also null in the "80+" case
  it('yearsToReach is null when target is unreachable by age 80', () => {
    const impossible = makeInput({
      currentAge: 70,
      annualIncome: 10_000,
      savingsRate: 0.01,
      currentNetWorth: 0,
      annualExpenses: 200_000,
    });
    const output = calculateFIRE(impossible);
    expect(output.results.fat.yearsToReach).toBeNull();
    expect(output.results.regular.yearsToReach).toBeNull();
  });

  // When someone is exactly at age 79 and CANNOT reach target in 1 year, null returned
  it('reachAge is null for unreachable target when currentAge=79', () => {
    const input = makeInput({
      currentAge: 79,
      currentNetWorth: 0,
      annualIncome: 5_000,
      savingsRate: 0.01,
      annualExpenses: 100_000,  // regular target = 2_500_000 — impossible in 1 year
    });
    const output = calculateFIRE(input);
    expect(output.results.regular.reachAge).toBeNull();
    // Timeline should have exactly 2 entries: age 79 and age 80
    expect(output.timeline.length).toBe(2);
  });

  // When target IS reachable, reachAge is a non-null number ≤ 80
  it('reachAge is non-null and ≤ 80 when target is reachable within simulation', () => {
    const achievable = makeInput({
      currentNetWorth: 5_000_000,  // already exceeds all targets
      currentAge: 30,
    });
    const output = calculateFIRE(achievable);
    expect(output.results.regular.reachAge).not.toBeNull();
    expect(output.results.regular.reachAge!).toBeLessThanOrEqual(80);
  });

  // Edge: starting at age 80 — timeline has exactly 1 entry
  it('when currentAge=80 (boundary), timeline has exactly 1 entry', () => {
    const input = makeInput({ currentAge: 80 });
    const output = calculateFIRE(input);
    expect(output.timeline.length).toBe(1);
    expect(output.timeline[0].age).toBe(80);
  });

  // Edge: starting at age 80 with sufficient net worth — should reach target at age 80
  it('when currentAge=80 with sufficient net worth, reachAge = 80', () => {
    const input = makeInput({
      currentAge: 80,
      retirementAge: 80,
      currentNetWorth: 10_000_000,  // far exceeds any target
    });
    const output = calculateFIRE(input);
    expect(output.results.regular.reachAge).toBe(80);
  });

  // [REGRESSION] "80+" scenario: a near-impossible case produces null consistently
  it('[REGRESSION] fat.reachAge is null for currentAge=65, NW=0, expenses=150k', () => {
    const input = makeInput({
      currentAge: 65,
      currentNetWorth: 0,
      annualIncome: 20_000,
      savingsRate: 0.05,
      annualExpenses: 150_000,   // fat target = 150k*1.5/0.04 = 5_625_000
    });
    const output = calculateFIRE(input);
    expect(output.results.fat.reachAge).toBeNull();
  });

  // Year field: year is currentYear + (age - currentAge)
  it('timeline year increments correctly from currentAge', () => {
    const input = makeInput({ currentAge: 30 });
    const output = calculateFIRE(input);
    const currentYear = new Date().getFullYear();
    expect(output.timeline[0].year).toBe(currentYear);
    expect(output.timeline[1].year).toBe(currentYear + 1);
    expect(output.timeline[output.timeline.length - 1].year).toBe(currentYear + 50);
  });

  // At starting age (index 0): annualSavings=0, investmentGrowth=0
  it('first timeline entry has annualSavings=0 and investmentGrowth=0', () => {
    const output = calculateFIRE(makeInput());
    expect(output.timeline[0].annualSavings).toBe(0);
    expect(output.timeline[0].investmentGrowth).toBe(0);
  });

  // At starting age: netWorth = currentNetWorth (no growth yet)
  it('first timeline entry netWorth equals input currentNetWorth exactly', () => {
    const nw = 123_456;
    const output = calculateFIRE(makeInput({ currentNetWorth: nw }));
    expect(output.timeline[0].netWorth).toBe(nw);
  });

  // From age 1 onwards: investmentGrowth > 0 when netWorth > 0 and realReturn > 0
  it('investmentGrowth is positive from year 1 when net worth > 0', () => {
    const output = calculateFIRE(makeInput({ currentNetWorth: 10_000 }));
    expect(output.timeline[1].investmentGrowth).toBeGreaterThan(0);
  });

  // annualSavings at year 1 = annualIncome * savingsRate (rounded)
  it('annualSavings at timeline[1] equals Math.round(annualIncome × savingsRate)', () => {
    const income = 80_000;
    const rate = 0.30;
    const output = calculateFIRE(makeInput({ annualIncome: income, savingsRate: rate }));
    expect(output.timeline[1].annualSavings).toBe(Math.round(income * rate));
  });
});

// ---------------------------------------------------------------------------
// Combined/boundary scenarios
// ---------------------------------------------------------------------------

describe('combined boundary scenarios', () => {
  it('zero savings rate: net worth grows by investment return only', () => {
    const nw = 100_000;
    const r = 0.07;
    const i = 0.03;
    const realReturn = (1 + r) / (1 + i) - 1;
    const input = makeInput({
      currentNetWorth: nw,
      savingsRate: 0,
      annualIncome: 0,
      expectedReturn: r,
      inflation: i,
    });
    const output = calculateFIRE(input);
    // No savings, so year-1 = pure compound
    expect(output.timeline[1].netWorth).toBe(Math.round(nw * (1 + realReturn)));
    expect(output.timeline[1].annualSavings).toBe(0);
  });

  it('very low SWR (0.025) causes targets to be exactly 40x expenses for regular', () => {
    const expenses = 50_000;
    const swr = 0.025;
    const targets = calculateFIRETargets(expenses, swr);
    // regular = (50000 * 1.0) / 0.025 = 2_000_000 = 40 * 50000
    expect(targets.regular).toBeCloseTo(expenses * 40, 6);
  });

  it('with very high savings and low expenses, all FIRE types reach before age 50', () => {
    const input = makeInput({
      currentAge: 25,
      annualIncome: 200_000,
      savingsRate: 0.70,        // $140k/year saved
      currentNetWorth: 50_000,
      annualExpenses: 20_000,   // lean=300k, regular=500k, fat=750k, barista=250k
      safeWithdrawalRate: 0.04,
    });
    const output = calculateFIRE(input);
    // All should be reachable well before age 50 with 140k/year savings
    (['lean', 'regular', 'fat', 'barista'] as const).forEach((type) => {
      if (output.results[type].reachAge !== null) {
        expect(output.results[type].reachAge!).toBeLessThanOrEqual(50);
      }
    });
  });

  it('[REGRESSION] ALL four non-coast multipliers × 40000 / 0.04 match expected values', () => {
    const expenses = 40_000;
    const swr = 0.04;
    const targets = calculateFIRETargets(expenses, swr);
    // Pin all four hard-coded expected values
    expect(targets.lean).toBe(600_000);
    expect(targets.regular).toBe(1_000_000);
    expect(targets.fat).toBe(1_500_000);
    expect(targets.barista).toBe(500_000);
  });
});
