import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { getPageLastModified } from '@/lib/content-pages';
import { Footer } from '@/components/layouts/footer';
import { preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages(['/']);
const home = await renderPage('/');

const decode = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');

const textOf = (html: string) =>
  decode(html.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

const FIRST_CONTROL = home.search(/<(input|button|select)\b/);
const aboveTool = home.slice(0, FIRST_CONTROL);

function elementByAttr(html: string, attr: string, tag = 'p'): string {
  const match = html.match(new RegExp(`<${tag}[^>]*${attr}[^>]*>[\\s\\S]*?</${tag}>`));
  expect(match, `<${tag} ${attr}> is in the server HTML`).not.toBeNull();
  return match![0];
}

const fmtShort = (n: number) => (n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`);

describe('UX P0-1 / D3: H1 question, then a one-line answer, then the tool', () => {
  it('there is exactly one H1 and it is a question', () => {
    const h1s = home.match(/<h1[\s>]/g) ?? [];
    expect(h1s).toHaveLength(1);
    expect(textOf(home.match(/<h1[^>]*>([\s\S]*?)<\/h1>/)![1])).toMatch(/\?$/);
  });

  it('the answer line is server-rendered above every control and is at most 40 words', () => {
    const lead = elementByAttr(aboveTool, 'data-answer-lead');
    expect(textOf(lead).split(' ').length).toBeLessThanOrEqual(40);
  });

  it('the answer line carries the figures, their condition, the named source and the page date', () => {
    const { results } = calculateFIRE(DEFAULT_INPUT);
    const lead = elementByAttr(aboveTool, 'data-answer-lead');
    const text = textOf(lead);
    for (const type of ['regular', 'lean', 'fat'] as const) expect(text).toContain(fmtShort(results[type].targetAmount));
    expect(text).toMatch(/default inputs \(age 30, \$40,000 a year in expenses, 4% safe withdrawal rate\)/);
    expect(lead).toMatch(/<a [^>]*href="https:\/\/[^"]+"[^>]*>Trinity Study \(1998\)<\/a>/);
    const date = getPageLastModified('/');
    expect(lead).toContain(`<time dateTime="${date}">`);
    expect(text).toMatch(/Updated [A-Z][a-z]+ \d{1,2}, \d{4}/);
  });

  it('the answer line makes no "checked", "verified" or "reviewed" claim (K30: no source-check record for the 4% rate)', () => {
    const text = textOf(elementByAttr(aboveTool, 'data-answer-lead'));
    expect(text).not.toMatch(/\b(checked|verified|reviewed)\b/i);
  });

  it('the page shows its date once above the tool, inside the answer line, not as a separate pill', () => {
    expect(aboveTool.match(/<time\b/g) ?? []).toHaveLength(1);
  });

  it('the season pill is not shown above the tool', () => {
    expect(textOf(aboveTool)).not.toMatch(/IRS typically announces/);
    expect(textOf(home)).toMatch(/IRS typically announces/);
    const afterTool = home.indexOf('IRS typically announces');
    expect(afterTool).toBeGreaterThan(home.indexOf('id="results-disclaimer"'));
  });
});

describe('UX D2: the disclaimer is summarised on the first screen and written out once below the result', () => {
  it('a one-line summary with a link to the full text sits above the tool', () => {
    const summary = elementByAttr(aboveTool, 'data-disclaimer-summary');
    const text = textOf(summary);
    expect(text.split(' ').length).toBeLessThanOrEqual(25);
    expect(text).toMatch(/not financial advice/i);
    expect(summary).toMatch(/<a [^>]*href="#results-disclaimer"/);
  });

  it('the full disclaimer text appears exactly once on the page', () => {
    expect(textOf(home).match(/for general informational purposes only/g) ?? []).toHaveLength(1);
    expect(home.match(/id="results-disclaimer"/g) ?? []).toHaveLength(1);
  });

  it('the full text comes directly after the result cards and before the long-form content and the FAQ', () => {
    const at = home.indexOf('id="results-disclaimer"');
    expect(at).toBeGreaterThan(home.indexOf('This Scenario'));
    expect(at).toBeLessThan(home.indexOf('Frequently Asked Questions'));
  });

  it('the summary and the full text keep the original wording', () => {
    const full = textOf(home);
    expect(full).toContain('It is not investment, tax, or financial advice.');
    expect(full).toContain('not a prediction or guarantee of actual results');
    expect(full).toContain('Consult a licensed financial advisor, tax professional, or attorney before acting on this scenario.');
  });

  it('the footer disclaimer link is a plain anchor, so a jump on the home page fires hashchange and the share state is restored', () => {
    const src = readFileSync(join(__dirname, '..', '..', 'src', 'components', 'layouts', 'footer.tsx'), 'utf8');
    expect(src).toMatch(/<a href="\/#results-disclaimer"/);
    expect(src).not.toMatch(/<Link href="\/#results-disclaimer"/);
  });

  it('the footer keeps its short disclaimer and links to the full text', () => {
    const footer = renderToStaticMarkup(createElement(Footer));
    expect(textOf(footer)).toContain('Not financial advice.');
    expect(footer).toContain('href="/#results-disclaimer"');
  });
});
