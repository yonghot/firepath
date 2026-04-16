import type { FIREInput, FIREOutput, FIRETimeline, FIREResult, FIREType } from '@/types/fire.types';
import { MAX_SIMULATION_AGE } from '@/constants/fire-defaults';
import { calculateFIRETargets } from './fire-targets';

/** Find the first age where net worth reaches the given target */
function findAchievementAge(
  timeline: FIRETimeline[],
  target: number,
  currentAge: number
): { yearsToReach: number | null; reachAge: number | null } {
  const entry = timeline.find((t) => t.netWorth >= target);
  if (!entry) return { yearsToReach: null, reachAge: null };
  return {
    yearsToReach: entry.age - currentAge,
    reachAge: entry.age,
  };
}

/** Find the age where current net worth will compound to regular target by retirement */
function findCoastFIREAge(
  timeline: FIRETimeline[],
  regularTarget: number,
  realReturn: number,
  retirementAge: number,
  currentAge: number
): { yearsToReach: number | null; reachAge: number | null } {
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
}

/** Build year-by-year net worth timeline */
function buildTimeline(
  currentAge: number,
  currentNetWorth: number,
  realReturn: number,
  annualSavings: number
): FIRETimeline[] {
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

  return timeline;
}

/** Build a single FIREResult object */
function buildResult(
  type: FIREType,
  target: number,
  achievement: { yearsToReach: number | null; reachAge: number | null },
  safeWithdrawalRate: number
): FIREResult {
  return {
    type,
    targetAmount: Math.round(target),
    yearsToReach: achievement.yearsToReach,
    reachAge: achievement.reachAge,
    monthlyPassiveIncome: Math.round((target * safeWithdrawalRate) / 12),
  };
}

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

  const realReturn = (1 + expectedReturn) / (1 + inflation) - 1;
  const annualSavings = annualIncome * savingsRate;
  const targets = calculateFIRETargets(annualExpenses, safeWithdrawalRate);

  const timeline = buildTimeline(currentAge, currentNetWorth, realReturn, annualSavings);

  const coastResult = findCoastFIREAge(timeline, targets.regular, realReturn, retirementAge, currentAge);
  const yearsToRetirement = retirementAge - currentAge;
  const coastTarget = targets.regular / Math.pow(1 + realReturn, yearsToRetirement);

  const results: Record<FIREType, FIREResult> = {
    lean: buildResult('lean', targets.lean, findAchievementAge(timeline, targets.lean, currentAge), safeWithdrawalRate),
    regular: buildResult('regular', targets.regular, findAchievementAge(timeline, targets.regular, currentAge), safeWithdrawalRate),
    fat: buildResult('fat', targets.fat, findAchievementAge(timeline, targets.fat, currentAge), safeWithdrawalRate),
    coast: buildResult('coast', coastTarget, coastResult, safeWithdrawalRate),
    barista: buildResult('barista', targets.barista, findAchievementAge(timeline, targets.barista, currentAge), safeWithdrawalRate),
  };

  return { timeline, results };
}
