import type { FIREInput } from '@/types/fire.types';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';

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
