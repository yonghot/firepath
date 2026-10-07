import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '@/components/layouts/footer';

vi.stubEnv('FEEDBACK_ENDPOINT', 'http://127.0.0.1:9/collect');
const html = renderToStaticMarkup(createElement(Footer));
vi.unstubAllEnvs();

function classTokens(attrs: string): string[] {
  return (/class="([^"]*)"/.exec(attrs)?.[1] ?? '').split(/\s+/).filter(Boolean);
}

function footerNavControls(): { tag: string; label: string; tokens: string[] }[] {
  const navs = [...html.matchAll(/<nav[\s>][\s\S]*?<\/nav>/g)].map((m) => m[0]);
  const controls: { tag: string; label: string; tokens: string[] }[] = [];
  for (const nav of navs) {
    for (const m of nav.matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      controls.push({ tag: m[1], label: m[3].replace(/<[^>]+>/g, '').trim(), tokens: classTokens(m[2]) });
    }
  }
  return controls;
}

describe('UX P0-3: the footer fits a 375px phone and its links are tappable (K26-5, K18)', () => {
  it('lays the four link columns out as a wrapping grid on phones, not a single no-wrap row', () => {
    const grid = [...html.matchAll(/<div class="([^"]*\bgrid\b[^"]*)">/g)].map((m) => m[1].split(/\s+/));
    const columns = grid.find((tokens) => tokens.includes('grid-cols-2'));
    expect(columns, 'a grid with two columns at the base width').toBeDefined();
    expect(columns).toContain('md:grid-cols-4');
    expect(columns).toContain('lg:flex');
  });

  it('never ships an unprefixed flex row with gap-12 (it measured 436px of scroll width at 375px)', () => {
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      const tokens = m[1].split(/\s+/);
      if (tokens.includes('gap-12')) {
        expect(tokens.includes('flex'), `"${m[1]}"`).toBe(false);
      }
    }
  });

  it('every column can shrink below its content width, so a long label wraps instead of widening the page', () => {
    const headed = [...html.matchAll(/<div class="([^"]*)"><h4/g)].map((m) => m[1].split(/\s+/));
    expect(headed).toHaveLength(4);
    for (const tokens of headed) expect(tokens).toContain('min-w-0');
  });

  it('uses no fixed pixel widths and does not hide overflow to cover a problem', () => {
    expect(html).not.toMatch(/\b(?:min-|max-)?w-\[\d+px\]/);
    expect(html).not.toMatch(/overflow-x-hidden|overflow-hidden/);
  });

  it('every link and button in the footer columns is at least 44px tall (min-h-11 on the 4px scale)', () => {
    const controls = footerNavControls();
    expect(controls.length).toBeGreaterThanOrEqual(14);
    const short = controls.filter((c) => !c.tokens.includes('min-h-11')).map((c) => c.label);
    expect(short).toEqual([]);
    for (const c of controls) expect(c.tokens, c.label).toContain('items-center');
  });

  it('keeps every footer link, including the consent, feedback and clear-data controls', () => {
    const labels = footerNavControls().map((c) => c.label);
    for (const label of [
      'Calculator',
      'Embed the Calculator',
      'The Complete FIRE Guide',
      'All Guides',
      'How We Calculate',
      'CoastFIRE',
      'LeanFIRE',
      'FatFIRE',
      'About',
      'Contact',
      'Send feedback',
      'Privacy Policy',
      'Terms of Service',
      'Do Not Sell or Share My Personal Information / Manage Consent',
      'Clear my saved calculator data',
    ]) {
      expect(labels).toContain(label);
    }
  });

  it('keeps the publisher line and the full-disclaimer link', () => {
    expect(html).toContain('Published by');
    expect(html).toContain('href="/#results-disclaimer"');
    expect(html).toContain('Full disclaimer');
  });
});
