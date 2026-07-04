/**
 * statistics.ts — unit tests (부속P CODE-04 acceptance criteria)
 *
 * Asserts the /fire-statistics dataset carries: a headline stat, a ranked
 * table, >=3 one-line quotable findings, and that every figure traces back
 * to calculateFIRE() — never a fabricated/hand-typed number.
 */

import { describe, it, expect } from 'vitest';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import {
  buildFireStatisticsDataset,
  STATISTICS_RETIREMENT_AGE_SCENARIOS,
} from '@/lib/seo/statistics';

describe('buildFireStatisticsDataset — 부속P CODE-04 acceptance criteria', () => {
  const dataset = buildFireStatisticsDataset();

  it('has a headline stat with real text and value', () => {
    expect(dataset.headline.text.length).toBeGreaterThan(20);
    expect(dataset.headline.value).toMatch(/\$/);
  });

  it('has a ranked table covering all 5 FIRE types, sorted descending by target amount', () => {
    expect(dataset.rankedFireTypes).toHaveLength(5);
    for (let i = 1; i < dataset.rankedFireTypes.length; i++) {
      expect(dataset.rankedFireTypes[i - 1].targetAmount).toBeGreaterThanOrEqual(
        dataset.rankedFireTypes[i].targetAmount
      );
    }
  });

  it('has >=3 one-line quotable findings (부속P CODE-04 acceptance: >=3 findings)', () => {
    expect(dataset.findings.length).toBeGreaterThanOrEqual(3);
    expect(dataset.findings.length).toBeLessThanOrEqual(5);
    for (const finding of dataset.findings) {
      expect(finding.length).toBeGreaterThan(20);
      expect(finding.length).toBeLessThan(400);
    }
  });

  it('every ranked-type target traces to calculateFIRE(DEFAULT_INPUT) — never fabricated', () => {
    const { results } = calculateFIRE(DEFAULT_INPUT);
    for (const row of dataset.rankedFireTypes) {
      expect(row.targetAmount).toBe(results[row.type].targetAmount);
      expect(row.monthlyPassiveIncome).toBe(results[row.type].monthlyPassiveIncome);
    }
  });

  it('every scenario row traces to calculateFIRE at that retirement age — never fabricated', () => {
    for (const scenario of dataset.scenarios) {
      const { results } = calculateFIRE({ ...DEFAULT_INPUT, retirementAge: scenario.retirementAge });
      for (const type of Object.keys(scenario.targets) as (keyof typeof scenario.targets)[]) {
        expect(scenario.targets[type]).toBe(results[type].targetAmount);
      }
    }
  });

  it('covers exactly the documented retirement-age scenario matrix (5 ages, not a combinatorial explosion — 부속P §8 anti-pattern #11)', () => {
    expect(dataset.scenarios.map((s) => s.retirementAge)).toEqual([...STATISTICS_RETIREMENT_AGE_SCENARIOS]);
    expect(dataset.scenarios.length).toBe(5);
  });

  it('carries a dataVerifiedDate matching CORE_ASSUMPTIONS_LAST_VERIFIED (never a hand-stamped date)', () => {
    expect(dataset.dataVerifiedDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('cites real sources with URLs (no fabricated attribution)', () => {
    expect(dataset.sources.length).toBeGreaterThanOrEqual(2);
    for (const s of dataset.sources) {
      expect(s.url).toMatch(/^https?:\/\//);
    }
  });

  it('is deterministic — calling it twice produces identical figures', () => {
    const second = buildFireStatisticsDataset();
    expect(second.headline.value).toBe(dataset.headline.value);
    expect(second.rankedFireTypes).toEqual(dataset.rankedFireTypes);
  });
});
