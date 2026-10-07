import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { FIREResultCards } from '@/components/features/calculator/fire-result-cards';
import { renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const html = renderWithProviders(createElement(FIREResultCards, { results: calculateFIRE(DEFAULT_INPUT).results }));
const classes = [...html.matchAll(/class="([^"]*)"/g)].map((m) => m[1].split(/\s+/));
const grid = html.match(/^<div class="([^"]*)"/)![1].split(/\s+/);

describe('UX P1-2: the five result cards never push the page sideways at 768-1275px', () => {
  it('no element carries a fixed minimum width (the 180px card minimum outgrew its column beside the 320px sidebar)', () => {
    const fixed = classes.flat().filter((token) => /(^|:)min-w-\[\d/.test(token));
    expect(fixed).toEqual([]);
  });

  it('each grid cell can shrink to its column, so a long label wraps instead of widening the grid', () => {
    const cells = [...html.matchAll(/<div class="([^"]*)"><div[^>]*role="button"/g)].map((m) => m[1].split(/\s+/));
    expect(cells).toHaveLength(5);
    for (const tokens of cells) expect(tokens).toContain('min-w-0');
  });

  it('stacks on phones, three across from 768px and five across from 1280px (where the sidebar leaves room)', () => {
    expect(grid).toContain('grid-cols-1');
    expect(grid).toContain('md:grid-cols-3');
    expect(grid).toContain('xl:grid-cols-5');
    expect(grid).not.toContain('md:grid-cols-5');
    expect(grid).not.toContain('lg:grid-cols-5');
  });

  it('the cards are still not a sideways-scrolling strip', () => {
    expect(grid.join(' ')).not.toMatch(/overflow-x|snap-/);
  });
});
