import type { FIREInput, FIREOutput, FIREType } from '@/types/fire.types';

// Asset class definitions with historical approximations
export interface AssetClass {
  id: string;
  label: string;
  expectedReturn: number; // annual nominal
  volatility: number; // annual std dev
  color: string;
}

export const ASSET_CLASSES: AssetClass[] = [
  { id: 'us_stocks', label: 'US Stocks', expectedReturn: 0.10, volatility: 0.15, color: '#2563EB' },
  { id: 'intl_stocks', label: "Int'l Stocks", expectedReturn: 0.08, volatility: 0.17, color: '#7C3AED' },
  { id: 'bonds', label: 'Bonds', expectedReturn: 0.04, volatility: 0.05, color: '#10B981' },
  { id: 'cash', label: 'Cash / MM', expectedReturn: 0.02, volatility: 0.01, color: '#F59E0B' },
];

// Correlation matrix (simplified)
const CORRELATIONS: number[][] = [
  [1.0, 0.75, -0.05, 0.0],  // US Stocks
  [0.75, 1.0, 0.05, 0.0],   // Int'l Stocks
  [-0.05, 0.05, 1.0, 0.3],  // Bonds
  [0.0, 0.0, 0.3, 1.0],     // Cash
];

export type RiskProfile = 'conservative' | 'moderate' | 'aggressive';

export interface PortfolioAllocation {
  profile: RiskProfile;
  label: string;
  allocations: { assetId: string; weight: number }[];
  expectedReturn: number;
  volatility: number;
  sharpeRatio: number;
}

export interface PortfolioResult {
  recommended: RiskProfile;
  portfolios: PortfolioAllocation[];
  yearsToFIRE: Record<FIREType, number | null>;
  projectedGrowth: { age: number; conservative: number; moderate: number; aggressive: number }[];
}

export const RISK_PROFILE_LABELS: Record<RiskProfile, string> = {
  conservative: 'Conservative',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

export const RISK_PROFILE_COLORS: Record<RiskProfile, string> = {
  conservative: '#10B981',
  moderate: '#2563EB',
  aggressive: '#7C3AED',
};

export const RISK_PROFILE_DESCRIPTIONS: Record<RiskProfile, string> = {
  conservative: 'Lower risk, steadier growth. Best for shorter time horizons or risk-averse investors.',
  moderate: 'Balanced risk and return. Suitable for most FIRE seekers with 10+ year horizons.',
  aggressive: 'Higher risk, higher potential return. Best for young investors with 15+ years to FIRE.',
};

const RISK_FREE_RATE = 0.02;
const PROFILES: RiskProfile[] = ['conservative', 'moderate', 'aggressive'];

// Model portfolios based on years to target — [US Stocks, Int'l Stocks, Bonds, Cash]
function getModelPortfolios(yearsToTarget: number): Record<RiskProfile, number[]> {
  if (yearsToTarget > 20) {
    return {
      conservative: [0.40, 0.15, 0.35, 0.10],
      moderate: [0.50, 0.20, 0.25, 0.05],
      aggressive: [0.60, 0.25, 0.12, 0.03],
    };
  } else if (yearsToTarget > 10) {
    return {
      conservative: [0.30, 0.10, 0.45, 0.15],
      moderate: [0.45, 0.15, 0.30, 0.10],
      aggressive: [0.55, 0.20, 0.20, 0.05],
    };
  } else if (yearsToTarget > 5) {
    return {
      conservative: [0.20, 0.10, 0.50, 0.20],
      moderate: [0.35, 0.15, 0.35, 0.15],
      aggressive: [0.45, 0.20, 0.25, 0.10],
    };
  } else {
    return {
      conservative: [0.15, 0.05, 0.55, 0.25],
      moderate: [0.25, 0.10, 0.45, 0.20],
      aggressive: [0.35, 0.15, 0.35, 0.15],
    };
  }
}

function calculatePortfolioStats(weights: number[]): { expectedReturn: number; volatility: number } {
  let expectedReturn = 0;
  for (let i = 0; i < weights.length; i++) {
    expectedReturn += weights[i] * ASSET_CLASSES[i].expectedReturn;
  }

  let variance = 0;
  for (let i = 0; i < weights.length; i++) {
    for (let j = 0; j < weights.length; j++) {
      variance +=
        weights[i] * weights[j] *
        ASSET_CLASSES[i].volatility * ASSET_CLASSES[j].volatility *
        CORRELATIONS[i][j];
    }
  }

  return { expectedReturn, volatility: Math.sqrt(variance) };
}

function recommendProfile(yearsToTarget: number, currentAge: number): RiskProfile {
  if (yearsToTarget > 15 && currentAge < 35) return 'aggressive';
  if (yearsToTarget > 10 && currentAge < 45) return 'moderate';
  if (yearsToTarget > 5) return 'moderate';
  return 'conservative';
}

/** Build PortfolioAllocation objects for each risk profile */
function buildPortfolioAllocations(models: Record<RiskProfile, number[]>): PortfolioAllocation[] {
  return PROFILES.map((profile) => {
    const weights = models[profile];
    const stats = calculatePortfolioStats(weights);
    const sharpeRatio = stats.volatility > 0
      ? (stats.expectedReturn - RISK_FREE_RATE) / stats.volatility
      : 0;

    return {
      profile,
      label: RISK_PROFILE_LABELS[profile],
      allocations: ASSET_CLASSES.map((ac, i) => ({ assetId: ac.id, weight: weights[i] })),
      expectedReturn: stats.expectedReturn,
      volatility: stats.volatility,
      sharpeRatio,
    };
  });
}

/** Project net worth growth for each portfolio strategy */
function projectGrowth(
  portfolios: PortfolioAllocation[],
  input: FIREInput
): PortfolioResult['projectedGrowth'] {
  const maxYears = 80 - input.currentAge;
  const annualSavings = input.annualIncome * input.savingsRate;
  const growth: PortfolioResult['projectedGrowth'] = [];

  for (let y = 0; y <= maxYears; y++) {
    const entry = { age: input.currentAge + y, conservative: 0, moderate: 0, aggressive: 0 };
    for (const p of portfolios) {
      const realReturn = (1 + p.expectedReturn) / (1 + input.inflation) - 1;
      let nw = input.currentNetWorth;
      for (let yr = 0; yr < y; yr++) {
        nw = nw * (1 + realReturn) + annualSavings;
      }
      entry[p.profile] = Math.round(nw);
    }
    growth.push(entry);
  }

  return growth;
}

/** Calculate years to each FIRE type using the recommended portfolio's return */
function calculateYearsToFIRE(
  recommended: PortfolioAllocation,
  input: FIREInput,
  fireResults: FIREOutput['results']
): Record<FIREType, number | null> {
  const maxYears = 80 - input.currentAge;
  const annualSavings = input.annualIncome * input.savingsRate;
  const realReturn = (1 + recommended.expectedReturn) / (1 + input.inflation) - 1;

  const yearsToFIRE: Record<FIREType, number | null> = {
    lean: null, regular: null, fat: null, coast: null, barista: null,
  };

  for (const type of ['lean', 'regular', 'fat', 'barista'] as const) {
    const target = fireResults[type].targetAmount;
    let nw = input.currentNetWorth;
    for (let y = 0; y <= maxYears; y++) {
      if (nw >= target) {
        yearsToFIRE[type] = y;
        break;
      }
      nw = nw * (1 + realReturn) + annualSavings;
    }
  }
  yearsToFIRE.coast = fireResults.coast.yearsToReach;

  return yearsToFIRE;
}

export function optimizePortfolio(
  input: FIREInput,
  fireResults: FIREOutput['results']
): PortfolioResult {
  const regularYears = fireResults.regular.yearsToReach;
  const yearsToTarget = regularYears ?? (input.retirementAge - input.currentAge);

  const models = getModelPortfolios(yearsToTarget);
  const recommended = recommendProfile(yearsToTarget, input.currentAge);
  const portfolios = buildPortfolioAllocations(models);
  const projectedGrowth = projectGrowth(portfolios, input);
  const recommendedPortfolio = portfolios.find((p) => p.profile === recommended)!;
  const yearsToFIRE = calculateYearsToFIRE(recommendedPortfolio, input, fireResults);

  return { recommended, portfolios, yearsToFIRE, projectedGrowth };
}
