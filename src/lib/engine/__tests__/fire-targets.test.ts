import { describe, it, expect } from 'vitest';
import { calculateFIRETargets } from '../fire-targets';
import { FIRE_MULTIPLIERS } from '@/constants/fire-defaults';

describe('calculateFIRETargets', () => {
  const expenses = 40000;
  const swr = 0.04;

  it('returns targets for all 4 non-coast FIRE types', () => {
    const targets = calculateFIRETargets(expenses, swr);
    expect(targets).toHaveProperty('lean');
    expect(targets).toHaveProperty('regular');
    expect(targets).toHaveProperty('fat');
    expect(targets).toHaveProperty('barista');
  });

  it('does not include coast type', () => {
    const targets = calculateFIRETargets(expenses, swr);
    expect(targets).not.toHaveProperty('coast');
  });

  it('calculates target = (expenses × multiplier) / SWR', () => {
    const targets = calculateFIRETargets(expenses, swr);
    expect(targets.lean).toBe((expenses * FIRE_MULTIPLIERS.lean) / swr);
    expect(targets.regular).toBe((expenses * FIRE_MULTIPLIERS.regular) / swr);
    expect(targets.fat).toBe((expenses * FIRE_MULTIPLIERS.fat) / swr);
    expect(targets.barista).toBe((expenses * FIRE_MULTIPLIERS.barista) / swr);
  });

  it('targets are ordered: barista < lean < regular < fat', () => {
    const targets = calculateFIRETargets(expenses, swr);
    expect(targets.barista).toBeLessThan(targets.lean);
    expect(targets.lean).toBeLessThan(targets.regular);
    expect(targets.regular).toBeLessThan(targets.fat);
  });

  it('regular target equals 25x expenses at 4% SWR', () => {
    const targets = calculateFIRETargets(expenses, swr);
    expect(targets.regular).toBe(expenses * 25); // 1.0 / 0.04 = 25
  });

  it('scales linearly with expenses', () => {
    const t1 = calculateFIRETargets(40000, swr);
    const t2 = calculateFIRETargets(80000, swr);
    expect(t2.regular).toBe(t1.regular * 2);
    expect(t2.lean).toBe(t1.lean * 2);
  });

  it('inversely scales with SWR', () => {
    const t1 = calculateFIRETargets(expenses, 0.04);
    const t2 = calculateFIRETargets(expenses, 0.08);
    expect(t2.regular).toBe(t1.regular / 2);
  });
});
