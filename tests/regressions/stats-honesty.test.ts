import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { FIRE_COLORS } from '@/constants/fire-colors';
import { FIREResultCard } from '@/components/features/calculator/fire-result-card';
import { metadata as statsMetadata } from '@/app/(main)/fire-statistics/page';
import { GET as getDataJson } from '@/app/data.json/route';
import { ALL_CONTENT_PAGES } from '@/lib/content-pages';
import { formatCurrency } from '@/lib/utils/format';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages();

const SRC = path.resolve(__dirname, '../../src');

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

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const rendered: Record<string, string> = {};
for (const route of Object.keys(PAGE_LOADERS)) rendered[route] = await renderPage(route);

describe('FIRE-37 (K4/K5): the scenario page says what it is', () => {
  const html = rendered['/fire-statistics'];
  const text = visibleText(html);

  it('H1 and title describe calculated scenarios, not statistics', () => {
    const h1 = visibleText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1]);
    expect(h1).toBe('FIRE Target Scenarios');
    const title = String(statsMetadata.title);
    expect(title.startsWith(`${h1}: `)).toBe(true);
    expect(title.length).toBeGreaterThanOrEqual(50);
    expect(title.length).toBeLessThanOrEqual(60);
    expect(String(statsMetadata.description)).toMatch(/not survey data/i);
    expect(text).toMatch(/not survey data/i);
  });

  it('no visible heading, title or registry entry presents these figures as statistics or "original" research', () => {
    expect(text).not.toMatch(/Original statistics|FIRE Statistics|Headline stat\b/i);
    expect(text).not.toMatch(/\bstatistic/i);
    for (const page of ALL_CONTENT_PAGES) {
      expect(`${page.title} ${page.description}`, page.canonicalPath).not.toMatch(/original|statistics/i);
    }
  });

  it('no source file calls the scenario page "original" statistics', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      if (/original[-, \w]{0,20}statistics/i.test(readFileSync(file, 'utf8'))) offenders.push(path.relative(SRC, file));
    }
    expect(offenders).toEqual([]);
  });

  it('the public feed states its basis', async () => {
    const body = await getDataJson().json();
    expect(String(body.basis)).toMatch(/calculated/i);
    expect(String(body.basis)).toMatch(/not survey data/i);
  });

  it('the hub card, the guide link and the other pages use the same name', () => {
    expect(visibleText(rendered['/guide'])).toContain('FIRE Target Scenarios');
    expect(visibleText(rendered['/fire-guide'])).toContain('FIRE Target Scenarios');
    for (const [route, page] of Object.entries(rendered)) {
      expect(visibleText(page), route).not.toContain('FIRE Statistics');
    }
  });
});

describe('FIRE-37: the /guide hub no longer repeats the default scenario table', () => {
  const html = rendered['/guide'];

  it('has no data table, but keeps the one-paragraph answer with its figures and sources', () => {
    expect(html).not.toContain('<table');
    const text = visibleText(html);
    const { results } = calculateFIRE(DEFAULT_INPUT);
    expect(text).toContain('Which FIRE strategy should you learn first?');
    expect(text).toMatch(/Lean FIRE needs \$\d+K, Regular FIRE needs \$[\d.]+M, and Fat FIRE needs \$[\d.]+M/);
    expect(results.regular.targetAmount).toBeGreaterThan(0);
    expect(text).toContain('Trinity Study (1998)');
    expect(text).not.toContain('Factors that affect this number');
  });

  it('still links every published guide card', () => {
    for (const href of ['/fire-guide', '/fire-types', '/healthcare-bridge', '/methodology', '/fire-statistics']) {
      expect(html).toContain(`href="${href}"`);
    }
  });
});

describe('FIRE-35 (K4/K26): the Coast card pairs the right number with the right label', () => {
  const { results } = calculateFIRE(DEFAULT_INPUT);
  const render = (type: 'coast' | 'lean', result = results[type]) =>
    renderToStaticMarkup(
      createElement(FIREResultCard, { type, result, color: FIRE_COLORS[type], isHighlighted: false, onHover: () => {} }),
    );

  it('names the target as the seed needed today and the age as when you become coast-ready', () => {
    const coast = results.coast;
    expect(coast.reachAge).not.toBeNull();
    const text = visibleText(render('coast'));
    expect(text).toContain('Seed needed today');
    expect(text).toContain(formatCurrency(coast.targetAmount));
    expect(text).toMatch(new RegExp(String.raw`Coast-ready at age\s+${coast.reachAge}\b`));
    expect(text).toContain('Monthly at retirement');
    expect(text).not.toMatch(/\bTarget\b/);
    expect(render('coast')).toMatch(/aria-label="Coast FIRE — coast-ready at age \d+, seed needed today \$/);
  });

  it('shows 80+ when no coast-ready age is reached by 80', () => {
    const text = visibleText(render('coast', { ...results.coast, reachAge: null, yearsToReach: null }));
    expect(text).toMatch(/Coast-ready at age\s+80\+/);
    expect(text).toContain('Seed needed today');
  });

  it('leaves the other cards unchanged', () => {
    const lean = render('lean');
    const text = visibleText(lean);
    expect(text).toContain('Target');
    expect(text).not.toMatch(/Seed needed today|Coast-ready|Monthly at retirement/);
    expect(lean).toMatch(/aria-label="Lean FIRE — reach age \d+, target \$/);
  });
});
