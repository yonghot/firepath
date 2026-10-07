import { DEFAULT_INPUT, SLIDER_CONFIGS } from '@/constants/fire-defaults';
import type { FIREInput } from '@/types/fire.types';

export function countChangedAdvanced(input: FIREInput): number {
  return SLIDER_CONFIGS.filter((config) => config.advanced && input[config.key] !== DEFAULT_INPUT[config.key]).length;
}
