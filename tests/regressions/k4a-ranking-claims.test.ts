import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';
import { FIRE_LABELS } from '@/constants/fire-colors';
import type { FIREType } from '@/types/fire.types';
import { formatCurrencyFull as money } from '@/lib/utils/format';
import { FIRE_TYPE_PAGES } from '@/lib/content-pages';
import { preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages(['/fire-types']);

const ROOT = path.resolve(__dirname, '../..');
const DEFAULTS = calculateFIRE(DEFAULT_INPUT).results;
const { annualExpenses, safeWithdrawalRate } = DEFAULT_INPUT;

const MULTIPLE_TYPES = ['lean', 'regular', 'fat', 'barista'] as const;
type MultipleType = (typeof MULTIPLE_TYPES)[number];
const ascending = [...MULTIPLE_TYPES].sort((a, b) => DEFAULTS[a].targetAmount - DEFAULTS[b].targetAmount);

const ORDINAL = ['', 'second', 'third', 'fourth'];
function rankWord(type: MultipleType): string {
  const index = ascending.indexOf(type);
  if (index === 0) return 'lowest';
  if (index === ascending.length - 1) return 'highest';
  return `${ORDINAL[index]}-lowest`;
}
const lowerThan = (type: MultipleType) => ascending.slice(0, ascending.indexOf(type));
const multiplierPct = (type: MultipleType) => `${Math.round(FIRE_MULTIPLIERS[type] * 100)}%`;
const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

function versus(type: MultipleType, other: MultipleType): string {
  const ratio = DEFAULTS[type].targetAmount / DEFAULTS[other].targetAmount;
  return `${Math.round(Math.abs(ratio - 1) * 100)}% ${ratio < 1 ? 'below' : 'above'} ${FIRE_LABELS[other]}`;
}

const OLD_LEAN_ANSWER_TAIL = "It's the smallest of the five targets because it assumes you cut spending to essentials in retirement.";

function leanRankingClaimIsTrue(answer: string): boolean {
  const m = answer.match(/It's the (lowest|highest|[a-z]+-lowest) of the (\d+) expense-multiple targets(?: \(lower: ([^)]+)\))?/);
  if (!m) return false;
  const expectedLower = lowerThan('lean')
    .map((t) => `${FIRE_LABELS[t]} at ${money(DEFAULTS[t].targetAmount)}`)
    .join(', ');
  return m[1] === rankWord('lean') && Number(m[2]) === MULTIPLE_TYPES.length && (m[3] ?? '') === expectedLower;
}

const decode = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');

function visibleText(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

function between(text: string, from: string, to: string): string {
  const start = text.indexOf(from);
  const end = text.indexOf(to, start);
  expect(start, from).toBeGreaterThanOrEqual(0);
  expect(end, to).toBeGreaterThan(start);
  return text.slice(start + from.length, end);
}

const factsOf = (type: MultipleType) => FIRE_TYPE_PAGES.find((p) => p.fireType === type)!.differentiatingFacts!;

describe('K4-a engine facts the ranking claims rest on', () => {
  it('at default inputs Lean is the second-lowest expense-multiple target, Barista the lowest, Fat the highest', () => {
    expect(ascending).toEqual(['barista', 'lean', 'regular', 'fat']);
    expect(rankWord('lean')).toBe('second-lowest');
    expect(DEFAULTS.coast.targetAmount).toBeLessThan(DEFAULTS.barista.targetAmount);
  });
});

describe('K4-a positive controls: the checkers reject the sentences shipped in d91a670', () => {
  it('rejects "the smallest of the five targets" for Lean', () => {
    expect(leanRankingClaimIsTrue(OLD_LEAN_ANSWER_TAIL)).toBe(false);
  });

  it('accepts a correct derived ranking phrase', () => {
    const ok = `It's the second-lowest of the 4 expense-multiple targets (lower: Barista FIRE at ${money(DEFAULTS.barista.targetAmount)}), because.`;
    expect(leanRankingClaimIsTrue(ok)).toBe(true);
  });
});

describe('K4-a C4: /fire-types claims about rank follow the engine', () => {
  it('the Lean FAQ answer ranks Lean among the expense-multiple targets and names what is lower', async () => {
    const text = visibleText(await renderPage('/fire-types'));
    const answer = between(
      text,
      'How much do I need for Lean FIRE?',
      "What's the difference between Regular FIRE and Fat FIRE?",
    );
    expect(leanRankingClaimIsTrue(answer)).toBe(true);
    expect(answer).toContain(money(DEFAULTS.lean.targetAmount));
    expect(answer).not.toMatch(/smallest of the five/i);
    expect(answer).toContain('Coast FIRE is left out of that ranking');
  });

  it('the Barista section compares itself with Lean using the real multipliers, and the direction is true', async () => {
    const text = visibleText(await renderPage('/fire-types'));
    expect(DEFAULTS.barista.targetAmount).toBeLessThan(DEFAULTS.lean.targetAmount);
    expect(text).toContain(
      `Barista FIRE reaches a lower target than Lean FIRE (${multiplierPct('barista')} vs. ${multiplierPct('lean')} of expenses)`,
    );
  });

  it('the Regular card worked example and the multiplier FAQ use the engine and constants', async () => {
    const text = visibleText(await renderPage('/fire-types'));
    expect(text).toContain(
      `"${1 / safeWithdrawalRate}× rule" at a ${Math.round(safeWithdrawalRate * 100)}% SWR: spend ${money(annualExpenses)}/yr → need ${money(DEFAULTS.regular.targetAmount)}`,
    );
    const multipliers = MULTIPLE_TYPES.map((t) => `${FIRE_MULTIPLIERS[t].toFixed(1)}x`).join('/');
    expect(text).toContain(`The FIRE type multipliers (${multipliers})`);
    expect(text).toContain(
      `Fat FIRE's target is exactly ${FIRE_MULTIPLIERS.fat / FIRE_MULTIPLIERS.regular}× Regular FIRE's`,
    );
  });

  it('no hand-typed dollar figure remains in the page source', () => {
    const source = stripComments(readFileSync(path.join(ROOT, 'src/app/(main)/fire-types/page.tsx'), 'utf8'));
    expect(source.match(/\$\d[\d,.]*/g) ?? []).toEqual([]);
    expect(source).not.toMatch(/\(\d+% vs\. \d+%/);
    expect(source).not.toMatch(/\(\d\.\dx\//);
  });
});

describe('K4-a C4: the registry facts for the FIRE-type anchors are computed, not typed', () => {
  const SECOND_LOWEST_OF_FIVE = 'Second-lowest target of the 5 FIRE types — 40% below Regular FIRE';

  it('no anchor ranks itself among "the 5 FIRE types" (Lean is third-lowest of five once the Coast seed counts)', () => {
    expect(factsOf('lean')).not.toContain(SECOND_LOWEST_OF_FIVE);
    expect(factsOf('lean').join(' ')).not.toMatch(/of the 5 FIRE types|of the 5 types/);
  });

  for (const type of MULTIPLE_TYPES) {
    it(`${type}: target, monthly income and multiplier come from calculateFIRE and FIRE_MULTIPLIERS`, () => {
      const facts = factsOf(type);
      expect(facts[0]).toBe(
        `Target amount at default inputs: ${money(DEFAULTS[type].targetAmount)} (${multiplierPct(type)} multiplier)`,
      );
      expect(facts[1]).toBe(`Monthly passive income at target: ${money(DEFAULTS[type].monthlyPassiveIncome)}/mo`);
    });
  }

  it('lean and fat and barista carry the derived rank among the expense-multiple types and the derived percentage vs. their reference', () => {
    expect(factsOf('lean')).toContain(
      `${capitalize(rankWord('lean'))} target of the ${MULTIPLE_TYPES.length} expense-multiple FIRE types — ${versus('lean', 'regular')}`,
    );
    expect(factsOf('fat')).toContain(
      `${capitalize(rankWord('fat'))} target of the ${MULTIPLE_TYPES.length} expense-multiple FIRE types — ${versus('fat', 'regular')}`,
    );
    expect(factsOf('barista')).toContain(
      `${capitalize(rankWord('barista'))} target of the ${MULTIPLE_TYPES.length} expense-multiple FIRE types — ${versus('barista', 'lean')}`,
    );
  });

  it('regular: the baseline multiple is 1 / SWR', () => {
    expect(factsOf('regular')).toContain(
      `The baseline "${1 / safeWithdrawalRate}x expenses" target every other FIRE type is defined relative to`,
    );
  });

  it('every spoke keeps at least the minimum number of facts', () => {
    for (const page of FIRE_TYPE_PAGES) expect(page.differentiatingFacts!.length).toBeGreaterThanOrEqual(4);
  });

  it('Coast is the only type whose target moves with retirement age, so its "shrinks the later" fact is true', () => {
    const early = calculateFIRE({ ...DEFAULT_INPUT, retirementAge: 50 }).results;
    const late = calculateFIRE({ ...DEFAULT_INPUT, retirementAge: 60 }).results;
    const moved = (Object.keys(early) as FIREType[]).filter((t) => early[t].targetAmount !== late[t].targetAmount);
    expect(moved).toEqual(['coast']);
    expect(late.coast.targetAmount).toBeLessThan(early.coast.targetAmount);
    expect(FIRE_TYPE_PAGES.find((p) => p.fireType === 'coast')!.differentiatingFacts).toContain(
      'The only FIRE type whose target shrinks the later the retirement age',
    );
  });

  it('the FIRE-type registry block has no hand-typed dollar figure', () => {
    const source = stripComments(readFileSync(path.join(ROOT, 'src/lib/content-pages.ts'), 'utf8'));
    const block = between(source, 'export const FIRE_TYPE_PAGES', 'export const GUIDE_PAGES');
    expect(block.match(/\$\d[\d,.]*/g) ?? []).toEqual([]);
  });
});
