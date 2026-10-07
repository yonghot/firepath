import type { FIREInput, FIREOutput } from '@/types/fire.types';
import { MEDICARE_ELIGIBILITY_AGE } from '@/lib/engine/healthcare-bridge';
import { canCarryBridgeAge, healthcareBridgeHref } from '@/lib/engine/url-state';
import { formatCurrency, formatCurrencyFull, formatPercent } from '@/lib/utils/format';

export const NEXT_STEP_HEADING = 'Next steps';

export type NextStepSlot = 'healthcare' | 'formula' | 'guide' | 'calc' | 'types';

export interface NextStepItem {
  slot: NextStepSlot;
  href: string;
  path: string;
  title: string;
  reason: string;
}

const years = (n: number) => `${n} ${n === 1 ? 'year' : 'years'}`;

const GUIDE_ITEM: NextStepItem = {
  slot: 'guide',
  href: '/fire-guide',
  path: '/fire-guide',
  title: 'Read the Complete FIRE Guide',
  reason: 'Where the 4% rule comes from, newer withdrawal-rate research and sequence-of-returns risk, with cited sources.',
};

const HEALTHCARE_ITEM: NextStepItem = {
  slot: 'healthcare',
  href: '/healthcare-bridge',
  path: '/healthcare-bridge',
  title: 'Estimate your health insurance before Medicare',
  reason: 'Retiring before 65 means paying for private coverage. Enter your own premium to see the cost.',
};

const TYPES_ITEM: NextStepItem = {
  slot: 'types',
  href: '/fire-types',
  path: '/fire-types',
  title: 'Compare the five FIRE types',
  reason: 'Lean, Regular, Fat, Coast and Barista targets with formulas and worked examples.',
};

function calcItem(title: string, reason: string): NextStepItem {
  return { slot: 'calc', href: '/', path: '/', title, reason };
}

function healthcareItemForScenario(input: FIREInput, output: FIREOutput): NextStepItem {
  const reach = output.results.regular.reachAge;
  const age = canCarryBridgeAge(input.currentAge, reach)
    ? reach
    : canCarryBridgeAge(input.currentAge, input.retirementAge)
      ? input.retirementAge
      : null;
  if (age === null) {
    return {
      ...HEALTHCARE_ITEM,
      reason: `Medicare starts at ${MEDICARE_ELIGIBILITY_AGE}. Estimate what private coverage costs if you retire earlier.`,
    };
  }
  const lead = age === reach ? `Reaching Regular FIRE at ${age}` : `Retiring at ${age}`;
  return {
    ...HEALTHCARE_ITEM,
    href: healthcareBridgeHref(input.currentAge, age),
    reason: `${lead} leaves ${years(MEDICARE_ELIGIBILITY_AGE - age)} before Medicare at ${MEDICARE_ELIGIBILITY_AGE}. Estimate what private coverage could cost.`,
  };
}

export function resultNextSteps(input: FIREInput, output: FIREOutput): NextStepItem[] {
  const regular = output.results.regular;
  return [
    healthcareItemForScenario(input, output),
    {
      slot: 'formula',
      href: '/fire-types#regular',
      path: '/fire-types#regular',
      title: 'See how the Regular FIRE target is built',
      reason: `${formatCurrencyFull(input.annualExpenses)} a year ÷ ${formatPercent(input.safeWithdrawalRate)} withdrawal rate = ${formatCurrency(regular.targetAmount)}. The same page covers Lean, Fat, Coast and Barista.`,
    },
    GUIDE_ITEM,
  ];
}

export function healthcareNextSteps(): NextStepItem[] {
  return [
    calcItem(
      'See when each FIRE type is reachable',
      'Your retirement age sets the bridge years. The calculator shows the age each of the five FIRE types reaches its target.',
    ),
    TYPES_ITEM,
    {
      ...GUIDE_ITEM,
      reason: 'The healthcare bridge before Medicare, the 4% rule and withdrawal-rate research, with cited sources.',
    },
  ];
}

export function fireTypesNextSteps(): NextStepItem[] {
  return [
    calcItem(
      'Run these formulas on your own numbers',
      'Enter your age, expenses and savings to see when each of the five types is reachable.',
    ),
    HEALTHCARE_ITEM,
    GUIDE_ITEM,
  ];
}

export function fireGuideNextSteps(): NextStepItem[] {
  return [
    calcItem(
      'Run your own FIRE numbers',
      'Enter your age, expenses and savings to see all five FIRE types on one timeline.',
    ),
    TYPES_ITEM,
    HEALTHCARE_ITEM,
  ];
}

export function guideHubNextSteps(): NextStepItem[] {
  return [
    calcItem(
      'Run your own FIRE numbers',
      'Enter your age, expenses and savings to compare all five FIRE types instantly.',
    ),
    TYPES_ITEM,
    HEALTHCARE_ITEM,
  ];
}
