import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { GUIDE_SOURCES } from '@/app/(main)/fire-guide/content';
import { metadata as homeMetadata } from '@/app/(main)/page';
import { metadata as guideMetadata } from '@/app/(main)/fire-guide/page';
import { FAQSection } from '@/components/common/faq-section';
import sitemap from '@/app/sitemap';
import noindexed from '@/data/noindex-paths.json';
import { SITE_URL } from '@/lib/site';
import { PAGE_LOADERS, preloadPages, renderPage, renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages();

const rendered: Record<string, string> = {};
for (const route of Object.keys(PAGE_LOADERS)) rendered[route] = await renderPage(route);

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

function firstWords(html: string, count: number): string {
  return visibleText(html).split(' ').slice(0, count).join(' ');
}

function h1Text(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  expect(match, 'page has an h1').not.toBeNull();
  return visibleText(match![1]);
}

function hrefsIn(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/g)].map((m) => decode(m[1]));
}

function titleOf(metadata: { title?: unknown }): string {
  const title = metadata.title as string | { absolute?: string } | undefined;
  return typeof title === 'string' ? title : (title?.absolute ?? '');
}

const fmtShort = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`);

describe('K23/K26-1: the home page answers the query before the calculator', () => {
  const home = rendered['/'];

  it('H1 names the FIRE calculator question, and the title is the same words', () => {
    const h1 = h1Text(home);
    expect(h1).toMatch(/FIRE calculator/i);
    expect(h1).toMatch(/retire early/i);
    expect(titleOf(homeMetadata)).toBe(h1);
    expect(String(homeMetadata.description)).toMatch(/FIRE calculator/i);
  });

  it('the first 100 words carry a dollar figure, its condition and a named source', () => {
    const lead = firstWords(home, 100);
    expect(lead).toMatch(/\$\d[\d,.]*[KM]?/);
    expect(lead).toMatch(/default inputs/i);
    expect(lead).toMatch(/\bage \d+/i);
    expect(lead).toMatch(/safe withdrawal rate/i);
    expect(lead).toMatch(/Trinity Study/);
  });

  it('the figures in that lead are the engine outputs at the default inputs', () => {
    const { results } = calculateFIRE(DEFAULT_INPUT);
    const lead = firstWords(home, 100);
    for (const type of ['regular', 'lean', 'fat'] as const) {
      expect(lead, type).toContain(fmtShort(results[type].targetAmount));
    }
  });

  it('the lead comes before the calculator controls', () => {
    const text = visibleText(home);
    expect(text.indexOf('Trinity Study')).toBeGreaterThan(-1);
    expect(text.indexOf('Trinity Study')).toBeLessThan(text.indexOf('Frequently Asked Questions'));
    const answerAt = home.indexOf('Trinity Study');
    const firstControl = home.search(/<(input|button|select)\b/);
    expect(firstControl).toBeGreaterThan(-1);
    expect(answerAt).toBeLessThan(firstControl);
  });

  it('the home first paragraph links to the guide and the FIRE types page', () => {
    const beforeCalculator = home.slice(0, home.search(/<(input|button|select)\b/));
    const hrefs = hrefsIn(beforeCalculator);
    expect(hrefs).toContain('/fire-guide');
    expect(hrefs).toContain('/fire-types');
  });
});

describe('K23: FAQ answers are in the server HTML, with no FAQ schema', () => {
  it('every FAQ question has its answer panel in the markup (home, fire-types, healthcare-bridge)', () => {
    for (const route of ['/', '/fire-types', '/healthcare-bridge']) {
      const html = rendered[route];
      const triggers = (html.match(/data-slot="accordion-trigger"/g) ?? []).length;
      const panels = (html.match(/data-slot="accordion-content"/g) ?? []).length;
      expect(triggers, `${route} has FAQ questions`).toBeGreaterThan(0);
      expect(panels, `${route} panels equal questions`).toBe(triggers);
    }
  });

  it('answer text is present in the HTML text of the home page', () => {
    const text = visibleText(rendered['/']);
    expect(text).toContain('The 4% rule suggests you can withdraw 4% of your portfolio annually');
    expect(text).toContain('FIRE is a financial movement focused on aggressive saving');
    expect(text).toContain('Clear my saved calculator data');
  });

  it('closed panels stay hidden for sighted users (hidden attribute, not removed from the DOM)', () => {
    const html = renderWithProviders(createElement(FAQSection));
    const panels = [...html.matchAll(/<div[^>]*data-slot="accordion-content"[^>]*>/g)].map((m) => m[0]);
    expect(panels.length).toBeGreaterThan(0);
    for (const tag of panels) expect(tag).toMatch(/\shidden/);
  });

  it('no FAQPage or HowTo structured data is emitted on any rendered page', () => {
    for (const [route, html] of Object.entries(rendered)) {
      const blocks = [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
      for (const block of blocks) expect(block, route).not.toMatch(/"@type":"(FAQPage|HowTo)"/);
    }
  });
});

describe('K23: /llms.txt lists exactly the indexable URLs', () => {
  const route = path.resolve(__dirname, '../../src/app/llms.txt/route.ts');
  const specifier = '@/app/llms.txt/route';

  it('the route exists and serves plain text', async () => {
    expect(existsSync(route), 'src/app/llms.txt/route.ts').toBe(true);
    const mod = await import(/* @vite-ignore */ specifier);
    const response = await mod.GET();
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toMatch(/^text\/plain/);
  });

  it('URLs equal the sitemap URLs and exclude every noindexed path', async () => {
    const mod = await import(/* @vite-ignore */ specifier);
    const body = await (await mod.GET()).text();
    const listed = [...body.matchAll(/^- \[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gm)].map((m) => m[1]).sort();
    const expected = sitemap().map((entry) => entry.url).sort();
    expect(expected.length).toBeGreaterThanOrEqual(8);
    expect(listed).toEqual(expected);
    for (const entry of noindexed) expect(body).not.toContain(`${SITE_URL}${entry.path}`);
    expect(body).toMatch(/^# FIREPath/m);
    expect(body).toContain('Actigence');
  });
});

describe('K24: no orphan pages', () => {
  it('every sitemap URL is linked from the body of at least one other rendered page', () => {
    const orphans: string[] = [];
    for (const entry of sitemap()) {
      const target = entry.url === SITE_URL ? '/' : entry.url.slice(SITE_URL.length);
      const linkedFrom = Object.entries(rendered).filter(
        ([page, html]) => page !== target && hrefsIn(html).some((href) => href.split(/[#?]/)[0] === target),
      );
      if (linkedFrom.length === 0) orphans.push(target);
    }
    expect(orphans).toEqual([]);
  });
});

describe('K17: /fire-guide first screen states the answer and the source count is true', () => {
  const guide = rendered['/fire-guide'];

  it('the first 100 words define FIRE, give the 25x target and name the 4% rule origin', () => {
    const lead = firstWords(guide, 100);
    expect(lead).toMatch(/financial independence, retire early/i);
    expect(lead).toMatch(/25 times/i);
    expect(lead).toMatch(/4% rule/);
    expect(lead).toMatch(/Bengen/);
  });

  it('the meta description counts the cited sources from the list and does not call them all official', () => {
    const description = String(guideMetadata.description);
    expect(description).toContain(`${GUIDE_SOURCES.length} cited sources`);
    expect(description).not.toMatch(/official sources/i);
  });
});
