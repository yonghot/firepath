import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CORE_FIGURES } from '@/lib/figures';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'font-sans', className: 'font-sans' }) }));

const ROOT = join(__dirname, '..', '..');

const decode = (s: string) =>
  s
    .replace(/&#x27;|&apos;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

const visibleText = (html: string) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  );

function listItems(html: string): string[] {
  return [...html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g)].map((m) => visibleText(m[1]).trim());
}

await preloadPages();

describe('K4: headline assumptions say what the cited sources support', () => {
  const paths = Object.keys(PAGE_LOADERS);

  for (const path of paths) {
    it(`${path}: no "peer-reviewed" claim and no unsupported 5.7% figure`, async () => {
      const text = visibleText(await renderPage(path));
      expect(text).not.toMatch(/peer-reviewed/i);
      expect(text).not.toContain('5.7%');
    });
  }

  for (const path of ['/', '/guide', '/fire-types']) {
    it(`${path}: the 7% default is labelled as an adjustable FIREPath assumption set below long-run returns`, async () => {
      const items = listItems(await renderPage(path)).filter((t) => /^7% default/.test(t));
      expect(items.length).toBe(1);
      expect(items[0]).toMatch(/assumption/i);
      expect(items[0]).toMatch(/adjust/i);
      expect(items[0]).toMatch(/below long-run U\.S\. stock returns/);
      expect(items[0]).toContain('NYU Stern');
    });
  }

  it('/methodology presents the NYU Stern and J.P. Morgan sources as context, not as the origin of the 7%', async () => {
    const text = visibleText(await renderPage('/methodology'));
    expect(text).not.toMatch(/basis for the 7%/);
    expect(text).not.toMatch(/corroborates nominal return/);
    expect(text).toMatch(/7% nominal return default is a FIREPath assumption set below/);
  });

  it('/fire-guide reports the Morningstar flexible-spending finding as "nearly 6%" and the base case as 3.9%', async () => {
    const text = visibleText(await renderPage('/fire-guide'));
    expect(text).toContain('nearly 6%');
    expect(text).toContain('3.9%');
    expect(text).not.toMatch(/2024 low of 3\.7%/);
  });

  it('/about calls the defaults adjustable and based on publicly cited sources', async () => {
    const text = visibleText(await renderPage('/about'));
    expect(text).toMatch(/based on publicly cited sources/);
  });

  it('the home explainer compounds at the real return, matching the engine and the methodology', async () => {
    const sentence = visibleText(await renderPage('/')).match(/Starting from the default net worth[^.]*\./)?.[0] ?? '';
    expect(sentence).not.toBe('');
    expect(sentence).toMatch(/real \(inflation-adjusted\) return/);
    expect(sentence).not.toMatch(/nominal/);

    const engine = readFileSync(join(ROOT, 'src/lib/engine/fire-calculator.ts'), 'utf8');
    expect(engine).toMatch(/netWorth\s*\*\s*\(1\s*\+\s*realReturn\)\s*\+\s*annualSavings/);
    expect(visibleText(await renderPage('/methodology'))).toMatch(/grow the balance by the real return/);
  });

  it('the expected-return figure metadata no longer claims an unverified corroboration', () => {
    const note = CORE_FIGURES.expectedReturn.note;
    expect(note).toMatch(/assumption/i);
    expect(note).not.toMatch(/corroborated/i);
  });

  it('docs/source-checks.md records URL, retrieval date and value for the sources the headline text cites', () => {
    const doc = readFileSync(join(ROOT, 'docs/source-checks.md'), 'utf8');
    expect(doc).toContain('https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html');
    expect(doc).toContain('https://www.morningstar.com/retirement/whats-safe-retirement-withdrawal-rate-2026');
    expect(doc).toMatch(/\| nyu-histretsp \|[^\n]*\| 20\d\d-\d\d-\d\d \|/);
    expect(doc).toMatch(/\| morningstar-2026-swr \|[^\n]*\| 20\d\d-\d\d-\d\d \|/);
    expect(doc).toContain('nearly 6%');
  });
});
