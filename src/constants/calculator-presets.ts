import type { FIREInput } from '@/types/fire.types';
import { DEFAULT_INPUT } from './fire-defaults';

/**
 * calculator-presets.ts — one-click "Try:" scenarios (부속U U-01).
 *
 * 481 GA4 page views → only 6 calc_input_start (1.2%): the calculator's
 * first-input friction kills the funnel before it starts. These presets let
 * a visitor inject a full, realistic scenario with a single click, driving
 * `updateInput()` for every field — the SAME code path a manual slider drag
 * takes (see calculator.store.ts `interactionCount`) — so the existing 부속I
 * T03 hasUserInteracted guard fires calc_input_start / calculator_complete
 * exactly as it would for a real edit. No new event, no `preset` param.
 *
 * NO FABRICATION (부속U §7 guardrail): every value below is a direct
 * override of age/income/savings-rate (or of age/savings-rate/net worth) spread onto
 * the app's own DEFAULT_INPUT (SLIDER_CONFIGS defaultValue — see
 * fire-defaults.ts) for every other field. Nothing here is a statistic,
 * average, or claim about real FIRE savers — these are user-input
 * scenarios fed through the real, unmodified `calculateFIRE()` engine,
 * identical to what a human typing the same numbers would get. Every
 * preset must differ from DEFAULT_INPUT, or clicking it changes nothing
 * (ux-presets-distinct.test.ts). See calculator-presets.test.ts for the
 * equality pins.
 */

export interface CalculatorPreset {
  /** Stable id — not sent to analytics, used only as the React key. */
  id: string;
  /** Button label, matches the "Try: ..." pattern from 부속U §5. */
  label: string;
  /** Full FIREInput to inject via updateInput() for every key. */
  input: FIREInput;
}

export const CALCULATOR_PRESETS: CalculatorPreset[] = [
  {
    id: 'young-saver',
    label: 'Try: 25, $60k income, 40% savings',
    input: { ...DEFAULT_INPUT, currentAge: 25, annualIncome: 60000, savingsRate: 0.4 },
  },
  {
    id: 'mid-career',
    label: 'Try: 40, $120k income, 25% savings',
    input: { ...DEFAULT_INPUT, currentAge: 40, annualIncome: 120000, savingsRate: 0.25 },
  },
  {
    // Net worth must cover the Coast seed for the default retirement age or the Coast card reads 80+ (pinned in constants/__tests__).
    id: 'coast-fire-35',
    label: 'Try: Coast FIRE at 35',
    input: { ...DEFAULT_INPUT, currentAge: 35, savingsRate: 0, currentNetWorth: 320000 },
  },
];
