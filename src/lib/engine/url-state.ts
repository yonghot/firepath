import type { FIREInput } from '@/types/fire.types';
import { DEFAULT_INPUT, SLIDER_CONFIGS } from '@/constants/fire-defaults';

/** Build a quick lookup from FIREInput key → SliderConfig for bounds clamping */
const SLIDER_BOUNDS = Object.fromEntries(
  SLIDER_CONFIGS.map((c) => [c.key, { min: c.min, max: c.max }])
) as Record<keyof FIREInput, { min: number; max: number }>;

const KEY_MAP: Record<keyof FIREInput, string> = {
  currentAge: 'a',
  retirementAge: 'ra',
  annualIncome: 'i',
  currentNetWorth: 'nw',
  savingsRate: 'sr',
  annualExpenses: 'e',
  expectedReturn: 'r',
  inflation: 'inf',
  safeWithdrawalRate: 'swr',
};

const REVERSE_KEY_MAP = Object.fromEntries(
  Object.entries(KEY_MAP).map(([k, v]) => [v, k])
) as Record<string, keyof FIREInput>;

export function encodeState(input: FIREInput): string {
  const params = new URLSearchParams();
  for (const [key, shortKey] of Object.entries(KEY_MAP)) {
    const value = input[key as keyof FIREInput];
    const defaultValue = DEFAULT_INPUT[key as keyof FIREInput];
    if (value !== defaultValue) {
      params.set(shortKey, String(value));
    }
  }
  return params.toString();
}

export function decodeState(hash: string): FIREInput | null {
  if (!hash) return null;

  try {
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const input = { ...DEFAULT_INPUT };
    let hasAnyParam = false;

    for (const [shortKey, fullKey] of Object.entries(REVERSE_KEY_MAP)) {
      const value = params.get(shortKey);
      if (value !== null) {
        const num = Number(value);
        if (!isNaN(num)) {
          // Clamp to slider bounds to prevent catastrophic inputs (e.g. SWR=0 → Infinity)
          const bounds = SLIDER_BOUNDS[fullKey];
          if (bounds) {
            if (num < bounds.min || num > bounds.max) {
              // Out-of-range — skip and keep default rather than storing an unsafe value
              continue;
            }
          }
          input[fullKey] = num;
          hasAnyParam = true;
        }
      }
    }

    return hasAnyParam ? input : null;
  } catch {
    return null;
  }
}
