export type FIREType = 'lean' | 'regular' | 'fat' | 'coast' | 'barista';

export interface FIREInput {
  currentAge: number;
  retirementAge: number;
  annualIncome: number;
  currentNetWorth: number;
  savingsRate: number;
  annualExpenses: number;
  expectedReturn: number;
  inflation: number;
  safeWithdrawalRate: number;
}

export interface FIRETimeline {
  age: number;
  year: number;
  netWorth: number;
  annualSavings: number;
  investmentGrowth: number;
}

export interface FIREResult {
  type: FIREType;
  targetAmount: number;
  yearsToReach: number | null;
  reachAge: number | null;
  monthlyPassiveIncome: number;
}

export interface FIREOutput {
  timeline: FIRETimeline[];
  results: Record<FIREType, FIREResult>;
}

export interface SliderConfig {
  key: keyof FIREInput;
  label: string;
  min: number;
  max: number;
  step: number;
  defaultValue: number;
  unit: 'dollar' | 'percent' | 'year';
  tooltip: string;
}

export interface Scenario {
  id: string;
  name: string;
  input: FIREInput;
  output: FIREOutput;
  createdAt: number;
}
