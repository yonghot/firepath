import type { FIREInput, FIREOutput } from '@/types/fire.types';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { CALCULATOR_PRESETS } from '@/constants/calculator-presets';
import { calculateFIRE } from './fire-calculator';

export type ScenarioKind = { kind: 'default' } | { kind: 'preset'; label: string } | { kind: 'custom' };

export interface GatedResult {
  withheld: boolean;
  isExample: boolean;
  caption: string;
  input: FIREInput;
  output: FIREOutput;
}

const EXAMPLE_OUTPUT = calculateFIRE(DEFAULT_INPUT);
const INPUT_KEYS = Object.keys(DEFAULT_INPUT) as Array<keyof FIREInput>;
const EXAMPLE_PREFIX = 'Example · ';

function sameInput(a: FIREInput, b: FIREInput): boolean {
  return INPUT_KEYS.every((key) => a[key] === b[key]);
}

export function resolveScenario(input: FIREInput): ScenarioKind {
  if (sameInput(input, DEFAULT_INPUT)) return { kind: 'default' };
  const preset = CALCULATOR_PRESETS.find((p) => sameInput(input, p.input));
  if (preset) return { kind: 'preset', label: preset.label.replace(/^Try: /, '') };
  return { kind: 'custom' };
}

export function gateResult({
  input,
  output,
  accepted,
}: {
  input: FIREInput;
  output: FIREOutput;
  accepted: boolean | null;
}): GatedResult {
  const scenario = resolveScenario(input);
  if (scenario.kind === 'default') {
    return { withheld: false, isExample: true, caption: `${EXAMPLE_PREFIX}default inputs`, input, output };
  }
  if (scenario.kind === 'preset') {
    return { withheld: false, isExample: true, caption: `${EXAMPLE_PREFIX}${scenario.label}`, input, output };
  }
  if (accepted === true) {
    return { withheld: false, isExample: false, caption: 'Your inputs', input, output };
  }
  return {
    withheld: true,
    isExample: true,
    caption: `${EXAMPLE_PREFIX}default inputs`,
    input: DEFAULT_INPUT,
    output: EXAMPLE_OUTPUT,
  };
}
