import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { preloadPages, renderPage } from './helpers/render-pages';

await preloadPages(['/terms']);

const TERMS_SOURCE = join(__dirname, '..', '..', 'src', 'app', '(main)', 'terms', 'page.tsx');
const text = (html: string) => html.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| /g, ' ').replace(/\s+/g, ' ');

function sectionNumbers(html: string): number[] {
  return [...html.matchAll(/<h2[^>]*>\s*(\d+)\.\s/g)].map((m) => Number(m[1]));
}

describe('K1: Terms carry no governing-law, venue or arbitration clauses and stay well numbered', () => {
  it('no jurisdiction, arbitration, class-action or jury language renders', async () => {
    const visible = text(await renderPage('/terms'));
    expect(visible).not.toMatch(/arbitrat/i);
    expect(visible).not.toMatch(/class action|class-action|jury/i);
    expect(visible).not.toMatch(/governed by the laws|governing law|\bvenue\b|competent courts/i);
  });

  it('numbered section headings are consecutive from 1', async () => {
    const numbers = sectionNumbers(await renderPage('/terms'));
    expect(numbers.length).toBeGreaterThanOrEqual(10);
    expect(numbers).toEqual(numbers.map((_, index) => index + 1));
  });

  it('every in-text "Section N" reference points at a heading that exists', async () => {
    const html = await renderPage('/terms');
    const headings = new Set(sectionNumbers(html));
    const references = [...text(html).matchAll(/Section\s+(\d+)/g)].map((m) => Number(m[1]));
    for (const reference of references) expect(headings.has(reference), `Section ${reference}`).toBe(true);
  });

  it('the source holds no operator note or arbitration markup', () => {
    const source = readFileSync(TERMS_SOURCE, 'utf8');
    expect(source).not.toMatch(/OPERATOR NOTE/);
    expect(source).not.toMatch(/arbitrat|Class Action/i);
  });
});
