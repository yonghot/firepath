import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';
import { FIRE_LABELS } from '@/constants/fire-colors';
import { formatCurrencyFull } from '@/lib/utils/format';

export type ExpenseMultipleType = 'lean' | 'regular' | 'fat' | 'barista';

const MULTIPLE_TYPES: ExpenseMultipleType[] = ['lean', 'regular', 'fat', 'barista'];
const { results } = calculateFIRE(DEFAULT_INPUT);
const ascending = [...MULTIPLE_TYPES].sort((a, b) => results[a].targetAmount - results[b].targetAmount);
const ORDINAL = ['', 'second', 'third', 'fourth'];

const multiplierPct = (type: ExpenseMultipleType): string => `${Math.round(FIRE_MULTIPLIERS[type] * 100)}%`;

function rankWord(type: ExpenseMultipleType): string {
  const index = ascending.indexOf(type);
  if (index === 0) return 'lowest';
  if (index === ascending.length - 1) return 'highest';
  return `${ORDINAL[index]}-lowest`;
}

function versus(type: ExpenseMultipleType, other: ExpenseMultipleType): string {
  const ratio = results[type].targetAmount / results[other].targetAmount;
  return `${Math.round(Math.abs(ratio - 1) * 100)}% ${ratio < 1 ? 'below' : 'above'} ${FIRE_LABELS[other]}`;
}

/** "the second-lowest of the 4 expense-multiple targets (lower: Barista FIRE at $500,000)" — Coast is excluded because its figure is a discounted seed. */
export function describeRankAmongExpenseMultiples(type: ExpenseMultipleType): string {
  const index = ascending.indexOf(type);
  const word = rankWord(type);
  const lower = ascending
    .slice(0, index)
    .map((t) => `${FIRE_LABELS[t]} at ${formatCurrencyFull(results[t].targetAmount)}`);
  return `the ${word} of the ${ascending.length} expense-multiple targets${lower.length ? ` (lower: ${lower.join(', ')})` : ''}`;
}

function rankFact(type: ExpenseMultipleType, reference: ExpenseMultipleType): string {
  const word = rankWord(type);
  return `${word[0].toUpperCase()}${word.slice(1)} target of the ${ascending.length} expense-multiple FIRE types — ${versus(type, reference)}`;
}

function baseFacts(type: ExpenseMultipleType): string[] {
  return [
    `Target amount at default inputs: ${formatCurrencyFull(results[type].targetAmount)} (${multiplierPct(type)} multiplier)`,
    `Monthly passive income at target: ${formatCurrencyFull(results[type].monthlyPassiveIncome)}/mo`,
  ];
}

/** differentiatingFacts for the four expense-multiple FIRE-type anchors, computed from the engine at DEFAULT_INPUT. */
export const EXPENSE_MULTIPLE_FACTS: Record<ExpenseMultipleType, string[]> = {
  lean: [
    ...baseFacts('lean'),
    rankFact('lean', 'regular'),
    `${multiplierPct('lean')} expense multiplier is unique to Lean FIRE (vs. ${MULTIPLE_TYPES.filter((t) => t !== 'lean')
      .map(multiplierPct)
      .join('/')} for the others)`,
  ],
  regular: [
    ...baseFacts('regular'),
    `The baseline "${1 / DEFAULT_INPUT.safeWithdrawalRate}x expenses" target every other FIRE type is defined relative to`,
    `${multiplierPct('regular')} expense multiplier — the only type that doesn't cut or inflate current spending`,
  ],
  fat: [
    ...baseFacts('fat'),
    rankFact('fat', 'regular'),
    `${multiplierPct('fat')} expense multiplier is unique to Fat FIRE`,
  ],
  barista: [
    ...baseFacts('barista'),
    'The only FIRE type modeled with a supplementary part-time income assumption',
    rankFact('barista', 'lean'),
  ],
};
