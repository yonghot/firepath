import type { FIREInput, FIREType } from '@/types/fire.types';
import { MAX_SIMULATION_AGE } from '@/constants/fire-defaults';

const FIRE_MULTIPLIERS: Record<Exclude<FIREType, 'coast'>, number> = {
  lean: 0.6,
  regular: 1.0,
  fat: 1.5,
  barista: 0.5,
};

export interface MonteCarloConfig {
  simulations: number; // default 1000
  volatility: number; // annual std dev of returns (e.g., 0.15 for 15%)
}

export interface MonteCarloPercentile {
  age: number;
  p10: number;
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}

export interface MonteCarloResult {
  percentiles: MonteCarloPercentile[];
  successRates: Record<FIREType, number>; // 0-1 probability
  medianReachAge: Record<FIREType, number | null>;
}

// Seeded pseudo-random number generator (Mulberry32)
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Box-Muller transform for normal distribution
function normalRandom(rand: () => number, mean: number, stdDev: number): number {
  const u1 = rand();
  const u2 = rand();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return mean + z * stdDev;
}

export function runMonteCarlo(
  input: FIREInput,
  config: MonteCarloConfig = { simulations: 1000, volatility: 0.15 }
): MonteCarloResult {
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

  const annualSavings = annualIncome * savingsRate;
  const years = MAX_SIMULATION_AGE - currentAge;

  // FIRE targets
  const targets: Record<Exclude<FIREType, 'coast'>, number> = {
    lean: (annualExpenses * FIRE_MULTIPLIERS.lean) / safeWithdrawalRate,
    regular: (annualExpenses * FIRE_MULTIPLIERS.regular) / safeWithdrawalRate,
    fat: (annualExpenses * FIRE_MULTIPLIERS.fat) / safeWithdrawalRate,
    barista: (annualExpenses * FIRE_MULTIPLIERS.barista) / safeWithdrawalRate,
  };

  // Coast target
  const realReturnBase = (1 + expectedReturn) / (1 + inflation) - 1;
  const yearsToRetirement = retirementAge - currentAge;
  const coastTarget = targets.regular / Math.pow(1 + realReturnBase, yearsToRetirement);

  // Run simulations
  const allPaths: number[][] = [];
  const reachAges: Record<FIREType, number[]> = {
    lean: [],
    regular: [],
    fat: [],
    coast: [],
    barista: [],
  };

  const rand = mulberry32(42); // deterministic seed for reproducibility

  for (let sim = 0; sim < config.simulations; sim++) {
    const path: number[] = [];
    let netWorth = currentNetWorth;

    for (let y = 0; y <= years; y++) {
      path.push(netWorth);

      if (y < years) {
        // Randomize annual return using normal distribution
        const randomReturn = normalRandom(rand, expectedReturn, config.volatility);
        const realReturn = (1 + randomReturn) / (1 + inflation) - 1;
        netWorth = netWorth * (1 + realReturn) + annualSavings;
        if (netWorth < 0) netWorth = 0;
      }
    }

    allPaths.push(path);

    // Track FIRE achievement ages for this simulation
    for (const [type, target] of Object.entries(targets) as [Exclude<FIREType, 'coast'>, number][]) {
      const reachYear = path.findIndex((nw) => nw >= target);
      if (reachYear >= 0) {
        reachAges[type].push(currentAge + reachYear);
      }
    }

    // Coast FIRE check
    for (let y = 0; y < path.length && currentAge + y < retirementAge; y++) {
      const yearsLeft = retirementAge - (currentAge + y);
      const coastTargetAtAge = targets.regular / Math.pow(1 + realReturnBase, yearsLeft);
      if (path[y] >= coastTargetAtAge) {
        reachAges.coast.push(currentAge + y);
        break;
      }
    }
  }

  // Calculate percentiles for each year
  const percentiles: MonteCarloPercentile[] = [];
  for (let y = 0; y <= years; y++) {
    const values = allPaths.map((p) => p[y]).sort((a, b) => a - b);
    const n = values.length;
    percentiles.push({
      age: currentAge + y,
      p10: values[Math.floor(n * 0.1)],
      p25: values[Math.floor(n * 0.25)],
      p50: values[Math.floor(n * 0.5)],
      p75: values[Math.floor(n * 0.75)],
      p90: values[Math.floor(n * 0.9)],
    });
  }

  // Calculate success rates
  const successRates: Record<FIREType, number> = {
    lean: reachAges.lean.length / config.simulations,
    regular: reachAges.regular.length / config.simulations,
    fat: reachAges.fat.length / config.simulations,
    coast: reachAges.coast.length / config.simulations,
    barista: reachAges.barista.length / config.simulations,
  };

  // Calculate median reach ages
  const medianReachAge: Record<FIREType, number | null> = {
    lean: null,
    regular: null,
    fat: null,
    coast: null,
    barista: null,
  };

  for (const type of Object.keys(reachAges) as FIREType[]) {
    const ages = reachAges[type].sort((a, b) => a - b);
    if (ages.length > 0) {
      medianReachAge[type] = ages[Math.floor(ages.length / 2)];
    }
  }

  return { percentiles, successRates, medianReachAge };
}
