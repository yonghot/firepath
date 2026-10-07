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

/** After an in-page anchor jump replaced the hash, the encoded inputs that must go back into the URL (empty at the defaults); null when the hash is empty or already carries a state. */
export function reconcileHash(currentHash: string, input: FIREInput): string | null {
  const bare = currentHash.replace(/^#/, '');
  if (!bare || decodeState(bare)) return null;
  return encodeState(input);
}

const HEALTHCARE_BRIDGE_PATH = '/healthcare-bridge';

/** Only the healthcare tool reads the carried hash, and only the two ages: other links keep their exact path (including in-page anchors) and no income or net worth leaves the calculator. */
export function scenarioHref(path: string, input: FIREInput): string {
  if (path !== HEALTHCARE_BRIDGE_PATH) return path;
  const params = new URLSearchParams({
    [KEY_MAP.currentAge]: String(input.currentAge),
    [KEY_MAP.retirementAge]: String(input.retirementAge),
  });
  return `${path}#${params.toString()}`;
}

export function decodeAges(hash: string): { currentAge: number; retirementAge: number } | null {
  const decoded = decodeState(hash);
  return decoded ? { currentAge: decoded.currentAge, retirementAge: decoded.retirementAge } : null;
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
