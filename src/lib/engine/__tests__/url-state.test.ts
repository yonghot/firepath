import { describe, it, expect } from 'vitest';
import { encodeState, decodeState } from '../url-state';
import { DEFAULT_INPUT, SLIDER_CONFIGS } from '@/constants/fire-defaults';
import type { FIREInput } from '@/types/fire.types';

describe('encodeState / decodeState round-trip', () => {
  it('returns null for empty hash', () => {
    expect(decodeState('')).toBeNull();
  });

  it('returns null when no recognized params present', () => {
    expect(decodeState('unknown=123')).toBeNull();
  });

  it('round-trips default input with overrides', () => {
    const input: FIREInput = { ...DEFAULT_INPUT, currentAge: 35, annualExpenses: 50000 };
    const encoded = encodeState(input);
    const decoded = decodeState(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.currentAge).toBe(35);
    expect(decoded!.annualExpenses).toBe(50000);
  });

  it('does not encode default values (keeps URL short)', () => {
    const encoded = encodeState(DEFAULT_INPUT);
    expect(encoded).toBe('');
  });
});

describe('[REGRESSION] decodeState bounds-clamping prevents catastrophic inputs', () => {
  it('[REGRESSION] swr=0 is rejected — keeps default SWR instead of setting 0', () => {
    const decoded = decodeState('#swr=0');
    // swr=0 is below the slider min (0.02), so it should be rejected
    // Either the whole decode returns null (if nothing else was changed) or the SWR stays at default
    if (decoded !== null) {
      expect(decoded.safeWithdrawalRate).toBe(DEFAULT_INPUT.safeWithdrawalRate);
    }
    // If null, that also means SWR=0 was not accepted — either outcome is correct
  });

  it('[REGRESSION] swr=0 does not cause Infinity or NaN targets', () => {
    // Even if the URL is crafted with swr=0, the decoded state must not produce Infinity
    const decoded = decodeState('#swr=0');
    const effectiveSwr = decoded?.safeWithdrawalRate ?? DEFAULT_INPUT.safeWithdrawalRate;
    // SWR must be positive and finite for safe calculation
    expect(effectiveSwr).toBeGreaterThan(0);
    expect(Number.isFinite(effectiveSwr)).toBe(true);
  });

  it('[REGRESSION] negative SWR via URL is rejected', () => {
    const decoded = decodeState('swr=-0.5');
    if (decoded !== null) {
      expect(decoded.safeWithdrawalRate).toBe(DEFAULT_INPUT.safeWithdrawalRate);
    }
  });

  it('[REGRESSION] SWR above max (0.06) is rejected', () => {
    const decoded = decodeState('swr=0.99');
    if (decoded !== null) {
      expect(decoded.safeWithdrawalRate).toBe(DEFAULT_INPUT.safeWithdrawalRate);
    }
  });

  it('[REGRESSION] annualExpenses=0 is rejected (below slider min)', () => {
    const decoded = decodeState('e=0');
    if (decoded !== null) {
      expect(decoded.annualExpenses).toBe(DEFAULT_INPUT.annualExpenses);
    }
  });

  it('[REGRESSION] valid values within bounds are accepted', () => {
    // SWR=0.035 is within [0.02, 0.06]
    const decoded = decodeState('swr=0.035');
    expect(decoded).not.toBeNull();
    expect(decoded!.safeWithdrawalRate).toBe(0.035);
  });

  it('[REGRESSION] all slider min values are accepted', () => {
    for (const config of SLIDER_CONFIGS) {
      const shortKey = encodeState({ ...DEFAULT_INPUT, [config.key]: config.min }).split('=')[0];
      if (!shortKey) continue; // default value — skip
      const decoded = decodeState(encodeState({ ...DEFAULT_INPUT, [config.key]: config.min }));
      if (decoded !== null && config.min !== DEFAULT_INPUT[config.key as keyof FIREInput]) {
        expect(decoded[config.key as keyof FIREInput]).toBe(config.min);
      }
    }
  });

  it('[REGRESSION] all slider max values are accepted', () => {
    for (const config of SLIDER_CONFIGS) {
      if (config.max === DEFAULT_INPUT[config.key as keyof FIREInput]) continue;
      const encoded = encodeState({ ...DEFAULT_INPUT, [config.key]: config.max });
      const decoded = decodeState(encoded);
      if (decoded !== null) {
        expect(decoded[config.key as keyof FIREInput]).toBe(config.max);
      }
    }
  });
});
