import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Footer } from '@/components/layouts/footer';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

await preloadPages();

const SRC = join(__dirname, '..', '..', 'src');
const SIBLING_HOSTS = /launchcostcalc\.com|saascostx\.com|legalcostcalc\.co\b|dentalcostfinder\.co\b/i;

function allFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? allFiles(path) : [path];
  });
}

describe('K9: no unrelated sibling-domain cross-links', () => {
  for (const path of Object.keys(PAGE_LOADERS)) {
    it(`${path}: renders no link or text pointing at a sibling cost-calculator site`, async () => {
      const html = await renderPage(path);
      expect(html.match(SIBLING_HOSTS)?.[0] ?? null).toBeNull();
      expect(html).not.toContain('More free cost calculators');
    });
  }

  it('the footer links no sibling site', () => {
    expect(renderToStaticMarkup(createElement(Footer, { premiumAvailable: false })).match(SIBLING_HOSTS)).toBeNull();
  });

  it('the cross-link component is gone', () => {
    expect(existsSync(join(SRC, 'components', 'common', 'related-calculators.tsx'))).toBe(false);
  });

  it('no source file under src names a sibling site host', () => {
    const offenders = allFiles(SRC)
      .filter((file) => /\.(tsx?|json|mjs|css)$/.test(file))
      .filter((file) => SIBLING_HOSTS.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });
});
