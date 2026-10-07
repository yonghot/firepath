import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DEFAULT_INPUT, MAX_SIMULATION_AGE, SLIDER_CONFIGS } from '@/constants/fire-defaults';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { decodeState, encodeState } from '@/lib/engine/url-state';
import { useCalculatorStore } from '@/stores/calculator.store';
import { countChangedAdvanced } from '@/lib/utils/advanced-inputs';
import { renderThenHydrate, type PageUnderTest } from './helpers/hydrate';
import { home } from './helpers/home-page';
import type { FIREInput } from '@/types/fire.types';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const { CalculatorPanel } = await import('@/components/features/calculator/calculator-panel');

const FIXTURES = '@/../tests/regressions/helpers/fixtures';

const advancedToggle = async (): Promise<PageUnderTest> => {
  const mod = (await import(/* @vite-ignore */ `${FIXTURES}/advanced-toggle`)) as Record<string, never>;
  return { tree: createElement(mod.AdvancedToggle), serverComponents: [] };
};

const panelHtml = () => renderToStaticMarkup(createElement(TooltipProvider, null, createElement(CalculatorPanel)));

function split(html: string) {
  const start = html.indexOf('<details');
  const end = html.indexOf('</details>');
  expect(start, 'the panel has a <details> disclosure').toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return {
    openTag: html.slice(start, html.indexOf('>', start) + 1),
    inside: html.slice(start, end + '</details>'.length),
    outside: html.slice(0, start) + html.slice(end + '</details>'.length),
  };
}

const valueInputs = (html: string) => [...html.matchAll(/<input[^>]*aria-label="([^"]+) value"/g)].map((m) => m[1]);
const sliders = (html: string) => [...html.matchAll(/<div[^>]*role="group"[^>]*data-slot="slider"[^>]*aria-label="([^"]+)"/g)].map((m) => m[1]);

const labelOf = Object.fromEntries(SLIDER_CONFIGS.map((c) => [c.key, c.label])) as Record<keyof FIREInput, string>;
const ADVANCED = SLIDER_CONFIGS.filter((c) => c.advanced).map((c) => c.key);
const VISIBLE = SLIDER_CONFIGS.filter((c) => !c.advanced).map((c) => c.key);

const FIRE_TYPES = ['lean', 'regular', 'fat', 'coast', 'barista'] as const;

function reachSwing(key: keyof FIREInput): number {
  const config = SLIDER_CONFIGS.find((c) => c.key === key)!;
  const ages = (value: number) => calculateFIRE({ ...DEFAULT_INPUT, [key]: value }).results;
  const low = ages(config.min);
  const high = ages(config.max);
  return FIRE_TYPES.reduce(
    (sum, type) => sum + Math.abs((low[type].reachAge ?? MAX_SIMULATION_AGE + 1) - (high[type].reachAge ?? MAX_SIMULATION_AGE + 1)),
    0,
  );
}

afterEach(() => {
  useCalculatorStore.setState({ input: DEFAULT_INPUT, output: calculateFIRE(DEFAULT_INPUT), interactionCount: 0, advancedOpen: false });
});

describe('UX D3: at most four inputs are visible, the rest sit under Advanced', () => {
  it('four parameters are visible and the other five are marked advanced', () => {
    expect(VISIBLE).toHaveLength(4);
    expect(ADVANCED).toHaveLength(5);
    expect([...VISIBLE, ...ADVANCED].sort()).toEqual(Object.keys(DEFAULT_INPUT).sort());
  });

  it('the visible four are the four whose full slider range moves the five FIRE ages the most, with a clear gap to the fifth', () => {
    const ranked = (Object.keys(DEFAULT_INPUT) as (keyof FIREInput)[]).map((key) => ({ key, swing: reachSwing(key) })).sort((a, b) => b.swing - a.swing);
    expect(ranked.slice(0, 4).map((r) => r.key).sort()).toEqual([...VISIBLE].sort());
    expect(ranked[3].swing).toBeGreaterThan(ranked[4].swing * 1.25);
  });

  it('outside the disclosure there are exactly four value fields and four sliders, labelled', () => {
    const { outside } = split(panelHtml());
    expect(valueInputs(outside)).toEqual(VISIBLE.map((k) => labelOf[k]));
    expect(sliders(outside)).toEqual(VISIBLE.map((k) => labelOf[k]));
  });

  it('the disclosure is a closed, server-rendered <details> with a keyboard-reachable <summary> named Advanced', () => {
    const { openTag, inside } = split(panelHtml());
    expect(openTag).not.toMatch(/\sopen(=|\s|>)/);
    const summary = inside.match(/<summary[^>]*>([\s\S]*?)<\/summary>/);
    expect(summary, 'a native <summary>').not.toBeNull();
    expect(summary![0]).toMatch(/Advanced/);
    expect(summary![0]).toMatch(/min-h-11/);
  });

  it('the closed summary names what is inside, so net worth and the assumptions are findable without opening it', () => {
    const summary = split(panelHtml()).inside.match(/<summary[\s\S]*?<\/summary>/)![0];
    for (const word of ['Net worth', 'retirement age', 'return', 'inflation', 'withdrawal rate']) expect(summary).toContain(word);
  });

  it('the server markup is closed whatever the shared flag says, so the first client render can never disagree with it', () => {
    useCalculatorStore.getState().setAdvancedOpen(true);
    expect(split(panelHtml()).openTag).not.toMatch(/\sopen/);
  });

  it('restoring a shared state or resetting to the defaults leaves the disclosure as the viewer left it', () => {
    useCalculatorStore.getState().setAdvancedOpen(true);
    useCalculatorStore.getState().setInput({ ...DEFAULT_INPUT, expectedReturn: 0.06 });
    useCalculatorStore.getState().resetToDefaults();
    expect(useCalculatorStore.getState().advancedOpen).toBe(true);
  });

  it('opening the disclosure in the browser reaches the shared flag and keeps it open, so a remounted panel (the mobile sheet unmounts it) starts open', async () => {
    const report = await renderThenHydrate(advancedToggle, new Date('2026-08-31T12:00:00Z'), { now: new Date('2026-10-08T00:10:00Z'), storage: {} });
    expect(report.problems).toEqual([]);
    expect(report.hydratedHtml).toMatch(/<output data-flag="true">/);
    expect(report.hydratedHtml).toMatch(/<details[^>]*\sopen=""/);
  }, 120_000);

  it('the other five parameters are all inside the disclosure and stay mounted while it is closed', () => {
    const html = panelHtml();
    const { inside } = split(html);
    expect(valueInputs(inside)).toEqual(ADVANCED.map((k) => labelOf[k]));
    expect(sliders(inside)).toEqual(ADVANCED.map((k) => labelOf[k]));
    expect(valueInputs(html)).toHaveLength(9);
    expect(sliders(html)).toHaveLength(9);
  });

  it('advanced thumbs are placed from the value, because a closed disclosure has no layout to measure; the visible four keep edge alignment', () => {
    const { inside, outside } = split(panelHtml());
    expect(inside).not.toMatch(/--position:/);
    expect(inside.match(/inset-inline-start:[\d.]+%/g)).toHaveLength(ADVANCED.length);
    expect(outside).toMatch(/--position:/);
  });

  it('the summary says nothing at the defaults and reserves its place for the count', () => {
    const summary = split(panelHtml()).inside.match(/<summary[\s\S]*?<\/summary>/)![0];
    expect(summary).not.toMatch(/changed/);
    expect(summary).toMatch(/<span class="[^"]*min-w-20[^"]*"><\/span>/);
  });

  it('counts only advanced values that differ from the defaults', () => {
    expect(countChangedAdvanced(DEFAULT_INPUT)).toBe(0);
    expect(countChangedAdvanced({ ...DEFAULT_INPUT, currentAge: 41, annualIncome: 120000 })).toBe(0);
    expect(countChangedAdvanced({ ...DEFAULT_INPUT, safeWithdrawalRate: 0.035, expectedReturn: 0.06, currentAge: 41 })).toBe(2);
    expect(countChangedAdvanced(Object.fromEntries(SLIDER_CONFIGS.map((c) => [c.key, c.max])) as unknown as FIREInput)).toBe(ADVANCED.length);
  });

  it('a share link that moves advanced values shows the count in the summary once the page has loaded and keeps all nine fields', async () => {
    const report = await renderThenHydrate(home, new Date('2026-08-31T12:00:00Z'), {
      now: new Date('2026-10-08T00:10:00Z'),
      storage: {},
      url: 'https://gofirepath.com/#a=41&r=0.06&swr=0.035',
    });
    expect(report.problems).toEqual([]);
    expect(report.hydratedHtml).toMatch(/>2 changed<\/span>/);
    const aside = report.hydratedHtml.match(/<aside[\s\S]*?<\/aside>/)![0];
    expect(valueInputs(aside)).toEqual(['Current Age', 'Annual Income', 'Savings Rate', 'Annual Expenses', 'Target Retirement Age', 'Current Net Worth', 'Expected Return', 'Inflation Rate', 'Safe Withdrawal Rate']);
    const shown = (label: string) => aside.match(new RegExp(`<input[^>]*aria-label="${label} value"[^>]*>`))![0].match(/value="([^"]*)"/)![1];
    expect(shown('Expected Return')).toMatch(/^6(\.0+)?%?$/);
    expect(shown('Safe Withdrawal Rate')).toMatch(/^3\.5(0+)?%?$/);
    expect(shown('Current Age')).toBe('41');
  }, 120_000);

  it('every parameter, advanced ones included, survives the share-link round trip', () => {
    for (const key of ADVANCED) {
      const config = SLIDER_CONFIGS.find((c) => c.key === key)!;
      const moved = { ...DEFAULT_INPUT, [key]: config.max };
      expect(decodeState(encodeState(moved)), key).toEqual(moved);
    }
    const everything = Object.fromEntries(SLIDER_CONFIGS.map((c) => [c.key, c.min])) as unknown as FIREInput;
    expect(decodeState(encodeState(everything))).toEqual(everything);
  });
});
