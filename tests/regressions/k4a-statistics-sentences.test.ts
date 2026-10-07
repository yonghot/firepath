import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';
import { FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import type { FIREType } from '@/types/fire.types';
import { formatCurrencyFull as money } from '@/lib/utils/format';
import { buildFireStatisticsDataset, STATISTICS_RETIREMENT_AGE_SCENARIOS } from '@/lib/seo/statistics';
import { GET as getDataJson } from '@/app/data.json/route';
import OgImage from '@/app/(main)/fire-statistics/opengraph-image';
import { preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/og', () => ({
  ImageResponse: class {
    constructor(public element: unknown) {}
  },
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages(['/fire-statistics']);

const ROOT = path.resolve(__dirname, '../..');
const DEFAULTS = calculateFIRE(DEFAULT_INPUT).results;
const SWR = DEFAULT_INPUT.safeWithdrawalRate;

const MULTIPLE_TYPES = ['lean', 'regular', 'fat', 'barista'] as const;
const ascending = [...MULTIPLE_TYPES].sort((a, b) => DEFAULTS[a].targetAmount - DEFAULTS[b].targetAmount);
const lowest = ascending[0];
const highest = ascending[ascending.length - 1];
const shortName = (t: FIREType) => FIRE_LABELS[t].replace(/ FIRE$/, '');
const spreadPct = ((DEFAULTS[highest].targetAmount / DEFAULTS[lowest].targetAmount - 1) * 100).toFixed(0);

const OLD_HEADLINE =
  'At the default 4% Safe Withdrawal Rate and $40,000/yr expenses, FIRE targets range from $600,000 (Lean) to $1,500,000 (Fat) — a 150% spread across the 5 FIRE types.';
const OLD_INCREMENT_FINDING =
  "The default 4% Safe Withdrawal Rate means every $1,000/yr of expenses adds $25,000 to every FIRE type's target.";

function rangeClaimIsTrue(text: string): boolean {
  const m = text.match(/range from (\$[\d,]+) \(([A-Za-z]+)\) to (\$[\d,]+) \(([A-Za-z]+)\)/);
  if (!m) return false;
  return (
    m[1] === money(DEFAULTS[lowest].targetAmount) &&
    m[2] === shortName(lowest) &&
    m[3] === money(DEFAULTS[highest].targetAmount) &&
    m[4] === shortName(highest)
  );
}

const INCREMENT_AMOUNT = 1000;
const bumped = calculateFIRE({ ...DEFAULT_INPUT, annualExpenses: DEFAULT_INPUT.annualExpenses + INCREMENT_AMOUNT }).results;
const increments = Object.fromEntries(
  FIRE_TYPES.map((t) => [t, bumped[t].targetAmount - DEFAULTS[t].targetAmount]),
) as Record<FIREType, number>;

function incrementClaims(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of text.matchAll(/(\$[\d,]+) to (?:the )?(Lean FIRE|Regular FIRE|Fat FIRE|Barista FIRE|Coast FIRE)\b/g)) {
    out[m[2]] = m[1];
  }
  return out;
}

function incrementClaimIsTrue(text: string): boolean {
  const claims = incrementClaims(text);
  return FIRE_TYPES.every((t) => claims[FIRE_LABELS[t]] === money(increments[t]));
}

const scenarioResults = STATISTICS_RETIREMENT_AGE_SCENARIOS.map(
  (retirementAge) => calculateFIRE({ ...DEFAULT_INPUT, retirementAge }).results,
);
const independentOfAge = FIRE_TYPES.filter((t) =>
  scenarioResults.every((r) => r[t].targetAmount === scenarioResults[0][t].targetAmount),
);
const coastShrinks =
  scenarioResults[scenarioResults.length - 1].coast.targetAmount < scenarioResults[0].coast.targetAmount;

function namesIn(list: string): string[] {
  return list.split(/, | and /).map((s) => s.trim()).filter(Boolean);
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

function collectText(node: unknown): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join(' ');
  if (typeof node === 'object' && 'props' in node) {
    return collectText((node as { props?: { children?: unknown } }).props?.children);
  }
  return '';
}

function datasetLd(html: string): { description: string } {
  for (const m of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    const node = JSON.parse(m[1]);
    if (node['@type'] === 'Dataset') return node;
  }
  throw new Error('no Dataset JSON-LD on /fire-statistics');
}

const dataset = buildFireStatisticsDataset();

describe('K4-a engine facts the sentences rest on', () => {
  it('the expense-multiple extremes at default inputs are Barista and Fat; Coast is lower still', () => {
    expect([lowest, highest]).toEqual(['barista', 'fat']);
    expect(DEFAULTS.coast.targetAmount).toBeLessThan(DEFAULTS[lowest].targetAmount);
  });

  it('closed form: each expense-multiple type moves by multiplier x $1,000 / SWR per extra $1,000 of expenses', () => {
    for (const t of MULTIPLE_TYPES) {
      expect(increments[t]).toBe(Math.round((INCREMENT_AMOUNT * FIRE_MULTIPLIERS[t]) / SWR));
    }
    expect(increments.regular).toBe(25_000);
    expect(increments.coast).toBeGreaterThan(0);
    expect(increments.coast).toBeLessThan(increments.barista);
  });

  it('only Coast depends on retirement age and its seed shrinks as retirement moves later', () => {
    expect(independentOfAge).toEqual(['lean', 'regular', 'fat', 'barista']);
    expect(coastShrinks).toBe(true);
  });
});

describe('K4-a positive controls: the claim checkers reject the sentences shipped in d91a670', () => {
  it('rejects the "$600,000 (Lean) to $1,500,000 (Fat) across the 5 FIRE types" headline', () => {
    expect(rangeClaimIsTrue(OLD_HEADLINE)).toBe(false);
  });

  it('rejects "$1,000/yr adds $25,000 to every FIRE type"', () => {
    expect(incrementClaimIsTrue(OLD_INCREMENT_FINDING)).toBe(false);
  });

  it('accepts a correct range sentence', () => {
    const ok = `range from ${money(DEFAULTS[lowest].targetAmount)} (${shortName(lowest)}) to ${money(DEFAULTS[highest].targetAmount)} (${shortName(highest)})`;
    expect(rangeClaimIsTrue(ok)).toBe(true);
  });
});

describe('K4-a C1: the headline range comes from the ranked results', () => {
  it('names the real lowest and highest expense-multiple targets, scoped to those types', () => {
    expect(rangeClaimIsTrue(dataset.headline.text)).toBe(true);
    expect(dataset.headline.text).toContain(`a ${spreadPct}% spread`);
    expect(dataset.headline.text).toContain(`${MULTIPLE_TYPES.length} expense-multiple FIRE types`);
    expect(dataset.headline.text).not.toMatch(/across the 5 FIRE types/);
  });

  it('states the Coast seed separately, with its engine value', () => {
    expect(dataset.headline.text).toContain(money(DEFAULTS.coast.targetAmount));
  });

  it('headline value is the same lowest-to-highest range', () => {
    expect(dataset.headline.value).toBe(`${money(DEFAULTS[lowest].targetAmount)} – ${money(DEFAULTS[highest].targetAmount)}`);
  });

  it('the rendered page, the Dataset JSON-LD and /data.json carry that exact sentence', async () => {
    const html = await renderPage('/fire-statistics');
    expect(visibleText(html)).toContain(dataset.headline.text);
    const ld = datasetLd(html);
    expect(ld.description).toBe(dataset.headline.text);
    expect(rangeClaimIsTrue(ld.description)).toBe(true);
    const body = await getDataJson().json();
    expect(body.headline.text).toBe(dataset.headline.text);
    expect(rangeClaimIsTrue(body.headline.text)).toBe(true);
    expect(body.headline.value).toBe(dataset.headline.value);
  });

  it('the OG image shows the real extremes and no "(lowest)"/"(highest)" labels', async () => {
    const response = (await OgImage()) as unknown as { element: unknown };
    const text = collectText(response.element);
    expect(text).not.toMatch(/\((lowest|highest)\)/i);
    expect(text).toContain(FIRE_LABELS[lowest]);
    expect(text).toContain(money(DEFAULTS[lowest].targetAmount));
    expect(text).toContain(FIRE_LABELS[highest]);
    expect(text).toContain(money(DEFAULTS[highest].targetAmount));
    expect(text).toContain(`Compared Across ${FIRE_TYPES.length} Types`);
  });
});

describe('K4-a C2: the per-$1,000 finding is computed per type', () => {
  const finding = dataset.findings.find((f) => /extra \$1,000\/yr of expenses/.test(f));

  it('exists and gives every type its own engine-derived increment', () => {
    expect(finding).toBeDefined();
    expect(incrementClaimIsTrue(finding!)).toBe(true);
  });

  it('is not the "same amount for every type" claim', () => {
    expect(finding).not.toMatch(/every FIRE type/i);
    expect(new Set(Object.values(incrementClaims(finding!))).size).toBe(FIRE_TYPES.length);
  });

  it('/data.json carries the same findings', async () => {
    const body = await getDataJson().json();
    expect(body.findings).toEqual(dataset.findings);
  });
});

describe('K4-a C3: retirement-age claims follow the engine', () => {
  it('the scenario finding lists exactly the age-independent types and the flat Regular value', () => {
    const finding = dataset.findings.find((f) => /stay flat/.test(f));
    expect(finding).toBeDefined();
    const listed = finding!.match(/\), the (.+?) targets stay flat/);
    expect(listed).not.toBeNull();
    expect(namesIn(listed![1]).sort()).toEqual(independentOfAge.map(shortName).sort());
    expect(finding).toContain(`${scenarioResults.length} retirement-age scenarios`);
    expect(finding).toContain(`${money(DEFAULTS.regular.targetAmount)} at every age`);
  });

  it('the Coast finding uses the derived direction and reason', () => {
    const finding = dataset.findings.find((f) => /Coast FIRE seed amount needed today/.test(f));
    expect(finding).toBeDefined();
    expect(finding).toContain(coastShrinks ? ' cuts the Coast FIRE seed' : ' raises the Coast FIRE seed');
    expect(finding!.includes('more years to compound')).toBe(coastShrinks);
    expect(finding).not.toContain('fewer years');
    const first = scenarioResults[0].coast.targetAmount;
    const last = scenarioResults[scenarioResults.length - 1].coast.targetAmount;
    expect(finding).toContain(`${money(first)} to ${money(last)}`);
  });

  it('the page sentence under the scenario table is the dataset note: independent types listed, Coast direction right', async () => {
    const text = visibleText(await renderPage('/fire-statistics'));
    expect(text).toContain(dataset.retirementAgeNote);
    const listed = dataset.retirementAgeNote.match(/^(.+?) targets do not depend on retirement age/);
    expect(listed).not.toBeNull();
    expect(namesIn(listed![1]).sort()).toEqual(independentOfAge.map(shortName).sort());
    expect(dataset.retirementAgeNote).toContain(
      coastShrinks ? 'shrinks the later you retire' : 'grows the later you retire',
    );
    expect(dataset.retirementAgeNote.includes('more years to compound')).toBe(coastShrinks);
    expect(dataset.retirementAgeNote).not.toContain('fewer years');
    expect(text).not.toContain('fewer years left to compound');
  });
});

describe('K4-a: the pairwise findings recompute from the engine', () => {
  const pct = (a: FIREType, b: FIREType) => ((DEFAULTS[a].targetAmount / DEFAULTS[b].targetAmount - 1) * 100).toFixed(0);

  it('Fat vs. Lean and Regular vs. Barista carry the engine percentages and amounts', () => {
    const fat = dataset.findings.find((f) => f.startsWith('Fat FIRE requires'));
    const regular = dataset.findings.find((f) => f.startsWith("Regular FIRE's target is"));
    expect(fat).toContain(`requires ${pct('fat', 'lean')}% more than Lean FIRE`);
    expect(fat).toContain(`(${money(DEFAULTS.fat.targetAmount)} vs. ${money(DEFAULTS.lean.targetAmount)})`);
    expect(regular).toContain(`is ${pct('regular', 'barista')}% higher than Barista FIRE's`);
    expect(regular).toContain(`(${money(DEFAULTS.regular.targetAmount)} vs. ${money(DEFAULTS.barista.targetAmount)})`);
  });
});

describe('K4-a recurrence guard: no hand-typed dollar figure in the summary-sentence sources', () => {
  const FILES = [
    'src/lib/seo/statistics.ts',
    'src/app/(main)/fire-statistics/page.tsx',
    'src/app/(main)/fire-statistics/opengraph-image.tsx',
    'src/app/data.json/route.ts',
  ];

  const stripComments = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  for (const file of FILES) {
    it(`${file} has no literal "$<digits>" figure`, () => {
      const source = stripComments(readFileSync(path.join(ROOT, file), 'utf8'));
      expect(source.match(/\$\d[\d,.]*/g) ?? []).toEqual([]);
    });
  }
});
