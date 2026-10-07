import { afterEach, describe, expect, it, vi } from 'vitest';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { CALCULATOR_PRESETS } from '@/constants/calculator-presets';
import type { FIREInput } from '@/types/fire.types';
import { resolveScenario, gateResult } from '@/lib/engine/example-scenarios';
import {
  TERMS_CONSENT_KEY,
  evaluateAgreeAttempt,
  readTermsConsent,
  writeTermsConsent,
} from '@/lib/terms-consent';

async function freshConsentModule(storage: ReturnType<typeof fakeStorage>) {
  vi.resetModules();
  vi.stubGlobal('window', { localStorage: storage, addEventListener: () => undefined, removeEventListener: () => undefined });
  vi.stubGlobal('localStorage', storage);
  return import('@/lib/terms-consent');
}

const custom: FIREInput = { ...DEFAULT_INPUT, currentAge: 33, annualExpenses: 52_000 };
const preset = CALCULATOR_PRESETS.find((p) => p.id === 'mid-career')!;

function fakeStorage(initial: Record<string, string> = {}, failWrites = false) {
  const data = { ...initial };
  const calls = { get: 0, set: 0 };
  return {
    data,
    calls,
    getItem: (key: string) => {
      calls.get += 1;
      return key in data ? data[key] : null;
    },
    setItem: (key: string, value: string) => {
      calls.set += 1;
      if (failWrites) throw new Error('quota');
      data[key] = value;
    },
  };
}

describe('UX P0-2 / D1: which results are an example and which are the visitor\'s own', () => {
  it('the default inputs and every preset are example scenarios; any other input is custom', () => {
    expect(resolveScenario(DEFAULT_INPUT)).toEqual({ kind: 'default' });
    expect(resolveScenario(preset.input)).toEqual({ kind: 'preset', label: '40, $120k income, 25% savings' });
    expect(resolveScenario(custom)).toEqual({ kind: 'custom' });
    expect(resolveScenario({ ...DEFAULT_INPUT, savingsRate: 0.31 })).toEqual({ kind: 'custom' });
  });

  it('a preset that equals the default inputs reads as the default example', () => {
    const same = CALCULATOR_PRESETS.find((p) => p.id === 'young-saver')!;
    expect(resolveScenario(same.input)).toEqual({ kind: 'default' });
  });

  it('before consent a custom scenario is withheld: the example shows, never the visitor\'s numbers', () => {
    const output = calculateFIRE(custom);
    const defaults = calculateFIRE(DEFAULT_INPUT);
    expect(output.results.regular.targetAmount).not.toBe(defaults.results.regular.targetAmount);
    for (const accepted of [false, null] as const) {
      const gated = gateResult({ input: custom, output, accepted });
      expect(gated.withheld).toBe(true);
      expect(gated.isExample).toBe(true);
      expect(gated.input).toEqual(DEFAULT_INPUT);
      expect(gated.output.results).toEqual(defaults.results);
      expect(gated.caption).toBe('Example · default inputs');
    }
  });

  it('the default and preset scenarios are visible without consent, labelled as examples', () => {
    const defaults = gateResult({ input: DEFAULT_INPUT, output: calculateFIRE(DEFAULT_INPUT), accepted: false });
    expect(defaults).toMatchObject({ withheld: false, isExample: true, caption: 'Example · default inputs' });

    const presetOutput = calculateFIRE(preset.input);
    const gated = gateResult({ input: preset.input, output: presetOutput, accepted: null });
    expect(gated.withheld).toBe(false);
    expect(gated.isExample).toBe(true);
    expect(gated.output).toBe(presetOutput);
    expect(gated.caption).toBe('Example · 40, $120k income, 25% savings');
  });

  it('after consent a custom scenario shows the visitor\'s own numbers', () => {
    const output = calculateFIRE(custom);
    const gated = gateResult({ input: custom, output, accepted: true });
    expect(gated).toMatchObject({ withheld: false, isExample: false, caption: 'Your inputs' });
    expect(gated.output).toBe(output);
    expect(gated.input).toBe(custom);
  });
});

describe('UX P0-2 / D1: the consent record and the agree attempt', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps the existing storage key and payload, so earlier agreements still count', () => {
    expect(TERMS_CONSENT_KEY).toBe('firepath_terms_consent');
    const storage = fakeStorage();
    expect(writeTermsConsent(storage)).toBe(true);
    const stored = JSON.parse(storage.data[TERMS_CONSENT_KEY]);
    expect(Object.keys(stored).sort()).toEqual(['accepted', 'timestamp']);
    expect(stored.accepted).toBe(true);
    expect(new Date(stored.timestamp).toISOString()).toBe(stored.timestamp);
    expect(readTermsConsent(storage)).toBe(true);
  });

  it('reads as not agreed when nothing is stored, the value is malformed or storage throws', () => {
    expect(readTermsConsent(fakeStorage())).toBe(false);
    expect(readTermsConsent(fakeStorage({ [TERMS_CONSENT_KEY]: '{' }))).toBe(false);
    expect(readTermsConsent(fakeStorage({ [TERMS_CONSENT_KEY]: '{"accepted":false,"timestamp":"x"}' }))).toBe(false);
    expect(readTermsConsent(fakeStorage({ [TERMS_CONSENT_KEY]: '{"accepted":true}' }))).toBe(false);
    expect(
      readTermsConsent({
        getItem: () => {
          throw new Error('blocked');
        },
        setItem: () => undefined,
      }),
    ).toBe(false);
  });

  it('nothing is written until the visitor agrees (no pre-checking, no injected record)', async () => {
    const storage = fakeStorage();
    const { getTermsConsentSnapshot, subscribeTermsConsent } = await freshConsentModule(storage);
    expect(getTermsConsentSnapshot()).toBe(false);
    const unsubscribe = subscribeTermsConsent(() => undefined);
    unsubscribe();
    expect(storage.calls.set).toBe(0);
    expect(storage.data).toEqual({});
  });

  it('agreeing stores the record, flips the snapshot and notifies subscribers', async () => {
    const storage = fakeStorage();
    const { acceptTerms, getTermsConsentSnapshot, subscribeTermsConsent } = await freshConsentModule(storage);
    const listener = vi.fn();
    const unsubscribe = subscribeTermsConsent(listener);
    expect(getTermsConsentSnapshot()).toBe(false);
    acceptTerms();
    expect(storage.calls.set).toBe(1);
    expect(getTermsConsentSnapshot()).toBe(true);
    expect(listener).toHaveBeenCalledTimes(1);
    unsubscribe();
  });

  it('when storage refuses the write the agreement still holds for this visit', async () => {
    const storage = fakeStorage({}, true);
    const { acceptTerms, getTermsConsentSnapshot } = await freshConsentModule(storage);
    expect(getTermsConsentSnapshot()).toBe(false);
    acceptTerms();
    expect(getTermsConsentSnapshot()).toBe(true);
  });

  it('pressing the primary button without the box ticked raises the alert and asks for focus on the checkbox', () => {
    expect(evaluateAgreeAttempt(false)).toEqual({
      accepted: false,
      alert: 'Tick the box to agree to the Terms of Use and see your numbers.',
      focusCheckbox: true,
    });
  });

  it('pressing it with the box ticked agrees and raises no alert', () => {
    expect(evaluateAgreeAttempt(true)).toEqual({ accepted: true, alert: null, focusCheckbox: false });
  });
});
