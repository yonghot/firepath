import type { FIREInput, FIREType } from '@/types/fire.types';
import { MAX_SIMULATION_AGE, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';

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

interface SimulationContext {
  currentAge: number;
  retirementAge: number;
  currentNetWorth: number;
  annualSavings: number;
  expectedReturn: number;
  inflation: number;
  years: number;
  targets: Record<Exclude<FIREType, 'coast'>, number>;
  realReturnBase: number;
}

/** Run a single simulation path and record FIRE achievement ages */
function runSingleSimulation(
  ctx: SimulationContext,
  rand: () => number,
  volatility: number,
  reachAges: Record<FIREType, number[]>
): number[] {
  const path: number[] = [];
  let netWorth = ctx.currentNetWorth;

  for (let y = 0; y <= ctx.years; y++) {
    path.push(netWorth);
    if (y < ctx.years) {
      const randomReturn = normalRandom(rand, ctx.expectedReturn, volatility);
      const realReturn = (1 + randomReturn) / (1 + ctx.inflation) - 1;
      netWorth = netWorth * (1 + realReturn) + ctx.annualSavings;
      if (netWorth < 0) netWorth = 0;
    }
  }

  // Track FIRE achievement ages
  for (const [type, target] of Object.entries(ctx.targets) as [Exclude<FIREType, 'coast'>, number][]) {
    const reachYear = path.findIndex((nw) => nw >= target);
    if (reachYear >= 0) {
      reachAges[type].push(ctx.currentAge + reachYear);
    }
  }

  // Coast FIRE check
  for (let y = 0; y < path.length && ctx.currentAge + y < ctx.retirementAge; y++) {
    const yearsLeft = ctx.retirementAge - (ctx.currentAge + y);
    const coastTargetAtAge = ctx.targets.regular / Math.pow(1 + ctx.realReturnBase, yearsLeft);
    if (path[y] >= coastTargetAtAge) {
      reachAges.coast.push(ctx.currentAge + y);
      break;
    }
  }

  return path;
}

/** Calculate percentiles from simulation paths */
function calculatePercentiles(
  allPaths: number[][],
  currentAge: number,
  years: number
): MonteCarloPercentile[] {
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
  return percentiles;
}

/** Calculate success rates and median reach ages from simulation results */
function calculateStatistics(
  reachAges: Record<FIREType, number[]>,
  simulations: number
): { successRates: Record<FIREType, number>; medianReachAge: Record<FIREType, number | null> } {
  const fireTypes: FIREType[] = ['lean', 'regular', 'fat', 'coast', 'barista'];

  const successRates = {} as Record<FIREType, number>;
  const medianReachAge = {} as Record<FIREType, number | null>;

  for (const type of fireTypes) {
    successRates[type] = reachAges[type].length / simulations;
    const ages = reachAges[type].sort((a, b) => a - b);
    medianReachAge[type] = ages.length > 0 ? ages[Math.floor(ages.length / 2)] : null;
  }

  return { successRates, medianReachAge };
}

export function runMonteCarlo(
  input: FIREInput,
  config: MonteCarloConfig = { simulations: 1000, volatility: 0.15 }
): MonteCarloResult {
  const annualSavings = input.annualIncome * input.savingsRate;
  const years = MAX_SIMULATION_AGE - input.currentAge;
  const realReturnBase = (1 + input.expectedReturn) / (1 + input.inflation) - 1;

  const targets: Record<Exclude<FIREType, 'coast'>, number> = {
    lean: (input.annualExpenses * FIRE_MULTIPLIERS.lean) / input.safeWithdrawalRate,
    regular: (input.annualExpenses * FIRE_MULTIPLIERS.regular) / input.safeWithdrawalRate,
    fat: (input.annualExpenses * FIRE_MULTIPLIERS.fat) / input.safeWithdrawalRate,
    barista: (input.annualExpenses * FIRE_MULTIPLIERS.barista) / input.safeWithdrawalRate,
  };

  const ctx: SimulationContext = {
    currentAge: input.currentAge,
    retirementAge: input.retirementAge,
    currentNetWorth: input.currentNetWorth,
    annualSavings,
    expectedReturn: input.expectedReturn,
    inflation: input.inflation,
    years,
    targets,
    realReturnBase,
  };

  const allPaths: number[][] = [];
  const reachAges: Record<FIREType, number[]> = {
    lean: [], regular: [], fat: [], coast: [], barista: [],
  };

  const rand = mulberry32(42); // deterministic seed for reproducibility
  for (let sim = 0; sim < config.simulations; sim++) {
    allPaths.push(runSingleSimulation(ctx, rand, config.volatility, reachAges));
  }

  const percentiles = calculatePercentiles(allPaths, input.currentAge, years);
  const { successRates, medianReachAge } = calculateStatistics(reachAges, config.simulations);

  return { percentiles, successRates, medianReachAge };
}
