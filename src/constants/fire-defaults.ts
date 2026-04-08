import type { SliderConfig, FIREInput, FIREType } from '@/types/fire.types';

/** Multipliers applied to annual expenses (divided by SWR) to get FIRE target */
export const FIRE_MULTIPLIERS: Record<Exclude<FIREType, 'coast'>, number> = {
  lean: 0.6,
  regular: 1.0,
  fat: 1.5,
  barista: 0.5,
};

export const SLIDER_CONFIGS: SliderConfig[] = [
  {
    key: 'currentAge',
    label: 'Current Age',
    min: 18,
    max: 70,
    step: 1,
    defaultValue: 30,
    unit: 'year',
    tooltip: 'Your current age',
  },
  {
    key: 'retirementAge',
    label: 'Target Retirement Age',
    min: 25,
    max: 80,
    step: 1,
    defaultValue: 65,
    unit: 'year',
    tooltip: 'The age you want to retire by',
  },
  {
    key: 'annualIncome',
    label: 'Annual Income',
    min: 10000,
    max: 1000000,
    step: 1000,
    defaultValue: 80000,
    unit: 'dollar',
    tooltip: 'Your gross annual income before taxes',
  },
  {
    key: 'currentNetWorth',
    label: 'Current Net Worth',
    min: 0,
    max: 10000000,
    step: 1000,
    defaultValue: 50000,
    unit: 'dollar',
    tooltip: 'Total savings + investments - debts',
  },
  {
    key: 'savingsRate',
    label: 'Savings Rate',
    min: 0,
    max: 0.9,
    step: 0.01,
    defaultValue: 0.3,
    unit: 'percent',
    tooltip: 'Percentage of income you save/invest annually',
  },
  {
    key: 'annualExpenses',
    label: 'Annual Expenses',
    min: 10000,
    max: 500000,
    step: 1000,
    defaultValue: 40000,
    unit: 'dollar',
    tooltip: 'Your total annual living expenses',
  },
  {
    key: 'expectedReturn',
    label: 'Expected Return',
    min: 0.01,
    max: 0.15,
    step: 0.005,
    defaultValue: 0.07,
    unit: 'percent',
    tooltip: 'Expected annual investment return (nominal)',
  },
  {
    key: 'inflation',
    label: 'Inflation Rate',
    min: 0,
    max: 0.1,
    step: 0.005,
    defaultValue: 0.03,
    unit: 'percent',
    tooltip: 'Expected annual inflation rate',
  },
  {
    key: 'safeWithdrawalRate',
    label: 'Safe Withdrawal Rate',
    min: 0.02,
    max: 0.06,
    step: 0.0025,
    defaultValue: 0.04,
    unit: 'percent',
    tooltip: 'Annual withdrawal rate in retirement (4% rule)',
  },
];

export const DEFAULT_INPUT: FIREInput = Object.fromEntries(
  SLIDER_CONFIGS.map((c) => [c.key, c.defaultValue])
) as unknown as FIREInput;

export const MAX_SIMULATION_AGE = 80;
