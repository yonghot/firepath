import type { FIREInput, FIREOutput, FIRETimeline, FIREResult, FIREType } from '@/types/fire.types';
import { MAX_SIMULATION_AGE, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';

export function calculateFIRE(input: FIREInput): FIREOutput {
  const {
    currentAge,
    retirementAge,
    annualIncome,
    currentNetWorth,
    savingsRate,
    annualExpenses,
    expectedReturn,
    inflation,
    safeWithdrawalRate,
  } = input;

  // Real return rate (Fisher equation)
  const realReturn = (1 + expectedReturn) / (1 + inflation) - 1;

  // Annual savings
  const annualSavings = annualIncome * savingsRate;

  // Calculate FIRE target amounts
  const targets: Record<Exclude<FIREType, 'coast'>, number> = {
    lean: (annualExpenses * FIRE_MULTIPLIERS.lean) / safeWithdrawalRate,
    regular: (annualExpenses * FIRE_MULTIPLIERS.regular) / safeWithdrawalRate,
    fat: (annualExpenses * FIRE_MULTIPLIERS.fat) / safeWithdrawalRate,
    barista: (annualExpenses * FIRE_MULTIPLIERS.barista) / safeWithdrawalRate,
  };

  // Build year-by-year timeline
  const timeline: FIRETimeline[] = [];
  let netWorth = currentNetWorth;
  const currentYear = new Date().getFullYear();

  for (let age = currentAge; age <= MAX_SIMULATION_AGE; age++) {
    const investmentGrowth = age === currentAge ? 0 : netWorth * realReturn;
    const savings = age === currentAge ? 0 : annualSavings;

    if (age > currentAge) {
      netWorth = netWorth * (1 + realReturn) + annualSavings;
    }

    timeline.push({
      age,
      year: currentYear + (age - currentAge),
      netWorth: Math.round(netWorth),
      annualSavings: Math.round(savings),
      investmentGrowth: Math.round(investmentGrowth),
    });
  }

  // Find achievement ages for each FIRE type
  const findAchievementAge = (target: number): { yearsToReach: number | null; reachAge: number | null } => {
    const entry = timeline.find((t) => t.netWorth >= target);
    if (!entry) return { yearsToReach: null, reachAge: null };
    return {
      yearsToReach: entry.age - currentAge,
      reachAge: entry.age,
    };
  };

  // CoastFIRE: find age where current netWorth will grow to regular target by retirement age
  const findCoastFIREAge = (): { yearsToReach: number | null; reachAge: number | null } => {
    const regularTarget = targets.regular;

    for (const entry of timeline) {
      if (entry.age >= retirementAge) break;

      const yearsToRetirement = retirementAge - entry.age;
      const coastTarget = regularTarget / Math.pow(1 + realReturn, yearsToRetirement);

      if (entry.netWorth >= coastTarget) {
        return {
          yearsToReach: entry.age - currentAge,
          reachAge: entry.age,
        };
      }
    }

    return { yearsToReach: null, reachAge: null };
  };

  const coastResult = findCoastFIREAge();

  // CoastFIRE target is the amount needed NOW that will grow to regular target by retirement
  const yearsToRetirement = retirementAge - currentAge;
  const coastTarget = targets.regular / Math.pow(1 + realReturn, yearsToRetirement);

  const buildResult = (type: FIREType, target: number, achievement: { yearsToReach: number | null; reachAge: number | null }): FIREResult => ({
    type,
    targetAmount: Math.round(target),
    yearsToReach: achievement.yearsToReach,
    reachAge: achievement.reachAge,
    monthlyPassiveIncome: Math.round((target * safeWithdrawalRate) / 12),
  });

  const results: Record<FIREType, FIREResult> = {
    lean: buildResult('lean', targets.lean, findAchievementAge(targets.lean)),
    regular: buildResult('regular', targets.regular, findAchievementAge(targets.regular)),
    fat: buildResult('fat', targets.fat, findAchievementAge(targets.fat)),
    coast: buildResult('coast', coastTarget, coastResult),
    barista: buildResult('barista', targets.barista, findAchievementAge(targets.barista)),
  };

  return { timeline, results };
}
