import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { gateResult } from '@/lib/engine/example-scenarios';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { getIndexablePages } from '@/lib/content-pages';
import {
  NEXT_STEP_HEADING,
  fireGuideNextSteps,
  fireTypesNextSteps,
  guideHubNextSteps,
  healthcareNextSteps,
  resultNextSteps,
} from '@/lib/next-steps';
import { ResultRelated } from '@/components/features/calculator/result-related';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { FIREResultCard } from '@/components/features/calculator/fire-result-card';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import type { FIREInput } from '@/types/fire.types';
import { hasStaticRoute } from './helpers/app-routes';
import { preloadPages, renderPage, renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const PAGES = ['/', '/healthcare-bridge', '/fire-types', '/fire-guide', '/guide'];
await preloadPages(PAGES);
const rendered = Object.fromEntries(await Promise.all(PAGES.map(async (p) => [p, await renderPage(p)])));

const ROOT = path.resolve(__dirname, '../..');
const decode = (value: string) => value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');
const textOf = (html: string) => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();

function blocks(html: string): string[] {
  return html.match(/<section\b[^>]*\bdata-next-step\b[\s\S]*?<\/section>/g) ?? [];
}

function anchors(html: string): { href: string; tag: string }[] {
  return [...html.matchAll(/<a\b([^>]*)>/g)].map((m) => ({
    tag: m[1],
    href: decode(/href="([^"]*)"/.exec(m[1])?.[1] ?? ''),
  }));
}

const defaultOutput = calculateFIRE(DEFAULT_INPUT);
const defaultReach = defaultOutput.results.regular.reachAge;

function resultBlockFor(input: FIREInput, accepted: boolean | null = true, embedded?: boolean): string {
  const gated = gateResult({ input, output: calculateFIRE(input), accepted });
  return renderToStaticMarkup(createElement(ResultRelated, { output: gated.output, input: gated.input, embedded }));
}

describe('UX P0-4 / K26-2: a server-rendered next-step block follows the home result', () => {
  const home = rendered['/'];

  it('is in the HTML a crawler gets, with no interaction and no agreement', () => {
    expect(blocks(home)).toHaveLength(1);
  });

  it('has one heading, the same one on every page, wired with aria-labelledby', () => {
    expect(NEXT_STEP_HEADING).toBe('Next steps');
    const block = blocks(home)[0];
    expect(block).toMatch(/aria-labelledby="next-step-heading"/);
    expect(block).toMatch(/<h2 id="next-step-heading"[^>]*>Next steps<\/h2>/);
    expect(home).not.toContain('More calculators');
  });

  it('sits below the result and its disclaimer and above the long answer, FAQ and embed code', () => {
    const at = home.indexOf('data-next-step');
    expect(at).toBeGreaterThan(home.indexOf('id="results-disclaimer"'));
    expect(at).toBeLessThan(home.indexOf('home-geo'));
    expect(at).toBeLessThan(home.indexOf('Frequently'));
  });

  it('offers the healthcare bridge, the formula page and the guide, in that order, all on this site', () => {
    const links = anchors(blocks(home)[0]);
    const expectedBridge =
      defaultReach !== null && defaultReach < 65
        ? `/healthcare-bridge#a=${DEFAULT_INPUT.currentAge}&ra=${defaultReach}`
        : '/healthcare-bridge';
    expect(links.map((l) => l.href)).toEqual([expectedBridge, '/fire-types#regular', '/fire-guide']);
    for (const link of links) {
      expect(link.tag).not.toMatch(/target=/);
      expect(link.href.startsWith('/')).toBe(true);
    }
  });

  it('each card quotes a number from the result that is on screen', () => {
    const text = textOf(blocks(home)[0]);
    expect(defaultReach).not.toBeNull();
    expect(text).toContain(`${65 - (defaultReach as number)} years before Medicare`);
    expect(text).toContain('$40,000 a year');
    expect(text).toContain('4.0% withdrawal rate');
    expect(text).toContain('$1.0M');
  });

  it('every link is a 44px-tall tap target', () => {
    for (const link of anchors(blocks(home)[0])) expect(link.tag).toMatch(/\bmin-h-11\b/);
  });

  it('keeps at least 150px between the links and the ad area that follows (K26-7)', () => {
    const cls = /<section\b[^>]*class="([^"]*)"[^>]*\bdata-next-step|<section\b[^>]*\bdata-next-step[^>]*class="([^"]*)"/.exec(
      blocks(home)[0],
    );
    const classes = (cls?.[1] ?? cls?.[2] ?? '').split(/\s+/);
    const marginBottom = classes.find((c) => /^mb-\d+$/.test(c));
    expect(marginBottom, 'next-step block has a bottom margin').toBeDefined();
    const monetization = readFileSync(path.join(ROOT, 'src/components/monetization/ResultMonetization.tsx'), 'utf8');
    const slotTop = /aria-label="Related offers and resources"[\s\S]{0,40}className="(?:[^"]*\s)?mt-(\d+)(?:\s|")/.exec(
      monetization,
    );
    expect(slotTop).not.toBeNull();
    expect(Number(marginBottom!.slice(3)) * 4 + Number(slotTop![1]) * 4).toBeGreaterThanOrEqual(150);
  });

  it('draws no ad-style chrome: no dashed border, no Advertisement or Sponsored label, no arrow glyphs', () => {
    const block = blocks(home)[0];
    expect(block).not.toMatch(/border-dashed/);
    expect(textOf(block)).not.toMatch(/advertis|sponsor|click here|scroll down/i);
    expect(block).not.toMatch(/lucide-arrow/);
  });
});

describe('UX P0-4 / D1: the block never carries the visitor\'s own numbers before they agree', () => {
  const custom: FIREInput = { ...DEFAULT_INPUT, currentAge: 41, annualExpenses: 64_000, annualIncome: 123_456, currentNetWorth: 777_777 };

  it('before agreement the block is the example, identical to the default render', () => {
    const before = resultBlockFor(custom, null);
    expect(before).toBe(resultBlockFor(DEFAULT_INPUT, null));
    expect(textOf(before)).not.toContain('64,000');
  });

  it('after agreement it quotes the visitor\'s own figures, and no income or net worth reaches any link', () => {
    const own = resultBlockFor(custom, true);
    expect(textOf(own)).toContain('$64,000 a year');
    for (const link of anchors(own)) expect(link.href).not.toMatch(/123456|777777|64000/);
  });

  it('the plain path reported to analytics never includes the carried ages', () => {
    const items = resultNextSteps(custom, calculateFIRE(custom));
    for (const item of items) expect(item.path).not.toContain('#a=');
  });
});

describe('UX P0-4: where the healthcare link points depends on what the scenario supports', () => {
  it('carries the age Regular FIRE is reached when that leaves a bridge before Medicare', () => {
    const items = resultNextSteps(DEFAULT_INPUT, defaultOutput);
    expect(items[0].href).toBe(`/healthcare-bridge#a=${DEFAULT_INPUT.currentAge}&ra=${defaultReach}`);
    expect(items[0].reason).toContain(`${65 - (defaultReach as number)} years before Medicare`);
  });

  it('links the plain tool when no age before 65 applies, so the tool starts from its own defaults', () => {
    const late: FIREInput = { ...DEFAULT_INPUT, currentAge: 60, annualExpenses: 400_000, annualIncome: 30_000, savingsRate: 0.02 };
    const output = calculateFIRE(late);
    expect(output.results.regular.reachAge).toBeNull();
    const [bridge] = resultNextSteps(late, output);
    expect(bridge.href).toBe('/healthcare-bridge');
    expect(bridge.reason).toMatch(/Medicare starts at 65/);
  });

  it('falls back to the target retirement age when Regular FIRE is not reached but that age is before 65', () => {
    const planned: FIREInput = { ...DEFAULT_INPUT, currentAge: 40, retirementAge: 55, annualExpenses: 400_000, annualIncome: 30_000, savingsRate: 0.02 };
    const output = calculateFIRE(planned);
    expect(output.results.regular.reachAge).toBeNull();
    const [bridge] = resultNextSteps(planned, output);
    expect(bridge.href).toBe('/healthcare-bridge#a=40&ra=55');
    expect(bridge.reason).toContain('Retiring at 55 leaves 10 years before Medicare');
  });

  it('only the healthcare link carries a hash it can read; the others keep their exact path', () => {
    const items = resultNextSteps(DEFAULT_INPUT, defaultOutput);
    expect(items.map((i) => i.slot)).toEqual(['healthcare', 'formula', 'guide']);
    expect(items[1].href).toBe('/fire-types#regular');
    expect(items[2].href).toBe('/fire-guide');
  });
});

describe('UX P0-4 / K24: the other content pages end with the same block, pointing only at indexable pages', () => {
  const indexable = new Set(getIndexablePages().map((p) => p.canonicalPath));

  const cases: [string, ReturnType<typeof healthcareNextSteps>][] = [
    ['/healthcare-bridge', healthcareNextSteps()],
    ['/fire-types', fireTypesNextSteps()],
    ['/fire-guide', fireGuideNextSteps()],
    ['/guide', guideHubNextSteps()],
  ];

  for (const [page, items] of cases) {
    it(`${page}: one block, ${NEXT_STEP_HEADING} heading, 3 internal links that resolve and are indexable, never itself`, () => {
      const html = rendered[page];
      expect(blocks(html)).toHaveLength(1);
      expect(blocks(html)[0]).toMatch(/<h2 id="next-step-heading"[^>]*>Next steps<\/h2>/);
      const links = anchors(blocks(html)[0]);
      expect(links.map((l) => l.href)).toEqual(items.map((i) => i.href));
      expect(links).toHaveLength(3);
      for (const { href, tag } of links) {
        expect(href.startsWith('/'), href).toBe(true);
        expect(hasStaticRoute(href), href).toBe(true);
        expect(indexable.has(href.split('#')[0]), href).toBe(true);
        expect(href.split('#')[0], 'a page does not link to itself').not.toBe(page);
        expect(tag).toMatch(/\bmin-h-11\b/);
      }
    });
  }

  it('/healthcare-bridge puts it straight after the calculator, before the explanation', () => {
    const html = rendered['/healthcare-bridge'];
    expect(html.indexOf('data-next-step')).toBeGreaterThan(html.indexOf('id="calculator-heading"'));
    expect(html.indexOf('data-next-step')).toBeLessThan(html.indexOf('id="how-it-works-heading"'));
  });

  it('/fire-types puts it after the five type sections and before the FAQ', () => {
    const html = rendered['/fire-types'];
    expect(html.indexOf('data-next-step')).toBeGreaterThan(html.indexOf('id="barista"'));
    expect(html.indexOf('data-next-step')).toBeLessThan(html.indexOf('FIRE Types FAQ'));
  });

  it('/fire-guide puts it after the guide sections and before the disclaimer, sources and end button', () => {
    const html = rendered['/fire-guide'];
    expect(html.indexOf('data-next-step')).toBeGreaterThan(html.indexOf('id="key-facts"'));
    expect(html.indexOf('data-next-step')).toBeLessThan(html.indexOf('aria-label="Sources and references"'));
    expect(html.indexOf('data-next-step')).toBeLessThan(html.indexOf('Run your own FIRE numbers'));
  });

  it('/guide keeps at least 96px between its ad slot, which comes first, and the block (AdSlot has my-6, margins collapse)', () => {
    const cls = /<section\b[^>]*\bdata-next-step[^>]*class="([^"]*)"/.exec(rendered['/guide']);
    const marginTop = (cls?.[1] ?? '').split(/\s+/).find((c) => /^mt-\d+$/.test(c));
    expect(marginTop).toBeDefined();
    expect(Number(marginTop!.slice(3)) * 4).toBeGreaterThanOrEqual(96);
  });

  it('/guide replaces the old single end button with the block, so there is one calculator link at the end, not two', () => {
    const html = rendered['/guide'];
    expect(html).not.toContain('Try the Calculator');
    expect(html).not.toContain('Ready to Plan Your FIRE Path?');
    expect(guideHubNextSteps().map((i) => i.href)).toContain('/');
  });
});

describe('UX P0-4 / K26-7: the owner console is told about the block', () => {
  it('docs/ad-exclusion-zones.md lists [data-next-step] for the Auto ads exclusion areas', () => {
    expect(readFileSync(path.join(ROOT, 'docs/ad-exclusion-zones.md'), 'utf8')).toContain('[data-next-step]');
  });
});

describe('UX P0-4: clicks reuse related_click with the portfolio-wide module name and no input values', () => {
  const source = readFileSync(path.join(ROOT, 'src/components/common/next-step-link.tsx'), 'utf8');

  it('reports module next_step, the card slot and the plain path', () => {
    expect(source).toMatch(
      /trackEvent\('related_click',\s*\{\s*link_module:\s*'next_step',\s*link_context:\s*item\.slot,\s*link_url:\s*item\.path\s*\}\)/,
    );
  });

  it('opens in a new tab inside the embed, as every other embedded link does', () => {
    const embedded = anchors(resultBlockFor(DEFAULT_INPUT, null, true));
    expect(embedded).toHaveLength(3);
    for (const { tag } of embedded) {
      expect(tag).toMatch(/\starget="_blank"/);
      expect(tag).toMatch(/\srel="[^"]*noopener/);
    }
  });
});

describe('UX P0-4 / K26-2: each result card leads to its formula', () => {
  const cardsHtml = (embedded?: boolean) =>
    renderWithProviders(createElement(FIREResultCards, { results: defaultOutput.results, embedded }));

  it('puts one "How <type> is calculated" link under each of the five cards, in card order', () => {
    const links = anchors(cardsHtml());
    expect(links.map((l) => l.href)).toEqual(FIRE_TYPES.map((type) => `/fire-types#${type}`));
    const labels = [...cardsHtml().matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((m) => textOf(m[1]));
    expect(labels).toEqual(FIRE_TYPES.map((type) => `How ${FIRE_LABELS[type]} is calculated`));
  });

  it('every link is a 44px target on this site and every fragment is a section of /fire-types', () => {
    expect(anchors(cardsHtml())).toHaveLength(5);
    for (const { href, tag } of anchors(cardsHtml())) {
      expect(tag).toMatch(/\bmin-h-11\b/);
      expect(tag).not.toMatch(/target=/);
      expect(rendered['/fire-types']).toContain(`id="${href.split('#')[1]}"`);
    }
  });

  it('the link sits next to the card, never inside the role="button" card', () => {
    const type = FIRE_TYPES[0];
    const single = renderWithProviders(
      createElement(FIREResultCard, {
        type,
        result: defaultOutput.results[type],
        color: FIRE_COLORS[type],
        isHighlighted: false,
        onHover: () => undefined,
      }),
    );
    expect(single).toContain('role="button"');
    expect(single).not.toContain('<a ');
  });

  it('is in the home HTML a crawler gets, inside the results section above the disclaimer', () => {
    const home = rendered['/'];
    const section = home.slice(home.indexOf('FIRE Numbers'), home.indexOf('id="results-disclaimer"'));
    expect(section.length).toBeGreaterThan(0);
    expect(anchors(section).map((l) => l.href)).toEqual(FIRE_TYPES.map((type) => `/fire-types#${type}`));
  });

  it('opens in a new tab inside the embed', () => {
    expect(anchors(cardsHtml(true))).toHaveLength(5);
    for (const { tag } of anchors(cardsHtml(true))) {
      expect(tag).toMatch(/\starget="_blank"/);
      expect(tag).toMatch(/\srel="[^"]*noopener/);
    }
  });

  it('reports related_click with module compare_chain, the type as context and the plain path', () => {
    const source = readFileSync(path.join(ROOT, 'src/components/features/calculator/fire-result-cards.tsx'), 'utf8');
    expect(source).toMatch(
      /trackEvent\('related_click',\s*\{\s*link_module:\s*'compare_chain',\s*link_context:\s*type,\s*link_url:\s*`\/fire-types#\$\{type\}`\s*\}\)/,
    );
  });
});
