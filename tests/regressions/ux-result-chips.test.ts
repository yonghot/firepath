import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { gateResult } from '@/lib/engine/example-scenarios';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import { ResultSummaryChips } from '@/components/features/calculator/result-summary-chips';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { preloadPages, renderPage, renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages(['/']);
const home = await renderPage('/');

const decode = (value: string) => value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

const short = (type: (typeof FIRE_TYPES)[number]) => FIRE_LABELS[type].replace(' FIRE', '');
const custom: FIREInput = { ...DEFAULT_INPUT, currentAge: 38, annualExpenses: 64_000, savingsRate: 0.15 };

function chipsHtml(input: FIREInput, accepted: boolean | null, output?: FIREOutput): string {
  const computed = output ?? calculateFIRE(input);
  const gated = gateResult({ input, output: computed, accepted });
  return renderWithProviders(createElement(ResultSummaryChips, { gated }));
}

function chipItems(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => textOf(m[1]));
}

describe('UX P0-1: one line of result chips instead of a swipe-only card strip', () => {
  it('shows all five FIRE ages at once, in the fixed type order, as "Type age"', () => {
    const { results } = calculateFIRE(DEFAULT_INPUT);
    const expected = FIRE_TYPES.map((type) => `${short(type)} ${results[type].reachAge ?? '80+'}`);
    expect(chipItems(chipsHtml(DEFAULT_INPUT, false))).toEqual(expected);
  });

  it('the text itself has a space between label and age, so crawlers and readers do not get "Lean46"', () => {
    const { results } = calculateFIRE(DEFAULT_INPUT);
    const raw = decode(chipsHtml(DEFAULT_INPUT, false).replace(/<[^>]+>/g, ''));
    for (const type of FIRE_TYPES) expect(raw).toContain(`${short(type)} ${results[type].reachAge ?? '80+'}`);
  });

  it('an unreached type reads 80+ rather than a blank', () => {
    const output = calculateFIRE(DEFAULT_INPUT);
    const unreached = { ...output, results: { ...output.results, fat: { ...output.results.fat, reachAge: null } } };
    expect(chipItems(chipsHtml(DEFAULT_INPUT, false, unreached))).toContain('Fat 80+');
  });

  it('carries the Example label before agreement and withholds the visitor\'s own ages', () => {
    const own = calculateFIRE(custom).results;
    const example = calculateFIRE(DEFAULT_INPUT).results;
    const ownLine = FIRE_TYPES.map((type) => `${short(type)} ${own[type].reachAge ?? '80+'}`).join('|');
    const exampleLine = FIRE_TYPES.map((type) => `${short(type)} ${example[type].reachAge ?? '80+'}`).join('|');
    expect(ownLine).not.toBe(exampleLine);

    const withheld = chipsHtml(custom, false);
    expect(textOf(withheld)).toContain('Example · default inputs');
    expect(chipItems(withheld).join('|')).toBe(exampleLine);

    const agreed = chipsHtml(custom, true);
    expect(textOf(agreed)).toContain('Your inputs');
    expect(chipItems(agreed).join('|')).toBe(ownLine);
  });

  it('marks each type with its locked colour and does not rely on colour alone', () => {
    const html = chipsHtml(DEFAULT_INPUT, true);
    for (const type of FIRE_TYPES) {
      expect(html).toContain(`background-color:${FIRE_COLORS[type]}`);
      expect(textOf(html)).toContain(short(type));
    }
  });

  it('explains that the Coast figure is the age you become coast-ready', () => {
    expect(chipsHtml(DEFAULT_INPUT, true)).toMatch(/aria-label="Coast FIRE: coast-ready at age \d+"/);
  });

  it('adds no new tap target: chips are text, not links or buttons', () => {
    expect(chipsHtml(DEFAULT_INPUT, true)).not.toMatch(/<(a|button|input)\b/);
  });

  it('numbers use tabular-nums', () => {
    expect(chipsHtml(DEFAULT_INPUT, true)).toMatch(/class="[^"]*\btabular-nums\b[^"]*"/);
  });
});

describe('UX P0-1: mobile order is answer, chips, presets, chart, cards', () => {
  it('the home page serves them in that order', () => {
    const order = ['data-answer-lead', 'data-result-chips', 'data-testid="calculator-presets"', 'FIRE Timeline', 'role="button" aria-label='];
    const positions = order.map((marker) => home.indexOf(marker));
    for (const [i, marker] of order.entries()) expect(positions[i], marker).toBeGreaterThan(-1);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it('the chips are rendered on the server, so the first screen has the ages without scripts', () => {
    const block = home.match(/<[a-z]+[^>]*data-result-chips[^>]*>[\s\S]*?<\/ul>/)?.[0] ?? '';
    expect(chipItems(block)).toHaveLength(5);
  });
});

describe('UX P0-1: the result cards no longer hide behind a sideways swipe on phones', () => {
  const html = renderWithProviders(
    createElement(FIREResultCards, { results: calculateFIRE(DEFAULT_INPUT).results }),
  );

  it('the cards container is not a scroll-snap strip', () => {
    const open = html.match(/^<div class="([^"]*)"/)![1];
    expect(open).not.toMatch(/overflow-x-auto|snap-x|snap-mandatory/);
    expect(html).not.toMatch(/snap-start/);
    expect(open).toContain('md:grid-cols-3');
    expect(open).toContain('xl:grid-cols-5');
  });

  it('all five cards are still there, each stacked at phone width', () => {
    expect((html.match(/role="button"/g) ?? []).length).toBe(5);
    const open = html.match(/^<div class="([^"]*)"/)![1];
    expect(open).toMatch(/\bgrid\b/);
    expect(open).toMatch(/\bgrid-cols-1\b/);
  });
});
