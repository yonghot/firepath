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
 * NO FABRICATION (부속U §7 guardrail): every value below is either the
 * app's own existing DEFAULT_INPUT (SLIDER_CONFIGS defaultValue — see
 * fire-defaults.ts) or a direct override of age/income/savings-rate per the
 * 부속U §5 parameter table, spread onto DEFAULT_INPUT for every other field.
 * Nothing here is a statistic, average, or claim about real FIRE savers —
 * these are user-input scenarios fed through the real, unmodified
 * `calculateFIRE()` engine, identical to what a human typing the same
 * numbers would get. See calculator-presets.test.ts for the equality pins.
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
    // This preset's values ARE the engine's own DEFAULT_INPUT — 부속U §5's
    // "30세·$80k·저축30%" scenario is, field for field, the app's existing
    // default. Spreading DEFAULT_INPUT (rather than retyping the numbers)
    // guarantees they can never drift out of sync with the real dataset.
    id: 'young-saver',
    label: 'Try: 30, $80k income, 30% savings',
    input: { ...DEFAULT_INPUT },
  },
  {
    id: 'mid-career',
    label: 'Try: 40, $120k income, 25% savings',
    input: { ...DEFAULT_INPUT, currentAge: 40, annualIncome: 120000, savingsRate: 0.25 },
  },
  {
    // Coast FIRE archetype: net worth already saved is left to compound with
    // NO further contributions (savingsRate 0) from age 35 onward. Every
    // other field stays the engine default — the point of this preset is to
    // demonstrate the Coast FIRE calculation, not to assert a specific
    // "already coasted" net worth that isn't in the dataset.
    id: 'coast-fire-35',
    label: 'Try: Coast FIRE at 35',
    input: { ...DEFAULT_INPUT, currentAge: 35, savingsRate: 0 },
  },
];
