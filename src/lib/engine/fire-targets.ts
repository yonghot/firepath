import type { FIREType } from '@/types/fire.types';
import { FIRE_MULTIPLIERS } from '@/constants/fire-defaults';

/**
 * Calculate FIRE target amounts for each non-coast FIRE type.
 * Target = (annualExpenses × multiplier) / safeWithdrawalRate
 */
export function calculateFIRETargets(
  annualExpenses: number,
  safeWithdrawalRate: number
): Record<Exclude<FIREType, 'coast'>, number> {
  return {
    lean: (annualExpenses * FIRE_MULTIPLIERS.lean) / safeWithdrawalRate,
    regular: (annualExpenses * FIRE_MULTIPLIERS.regular) / safeWithdrawalRate,
    fat: (annualExpenses * FIRE_MULTIPLIERS.fat) / safeWithdrawalRate,
    barista: (annualExpenses * FIRE_MULTIPLIERS.barista) / safeWithdrawalRate,
  };
}
