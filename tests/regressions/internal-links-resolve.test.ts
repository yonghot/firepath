import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import EmbedPage from '@/app/embed/page';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { PAGE_LOADERS, preloadPages, renderPage, renderWithProviders } from './helpers/render-pages';
import { resolvesToRoute } from './helpers/app-routes';
import { decodeAges } from '@/lib/engine/url-state';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages();

const SRC = path.resolve(__dirname, '../../src');

const decode = (value: string) => value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"');

const rendered: Record<string, string> = {};
for (const route of Object.keys(PAGE_LOADERS)) rendered[route] = await renderPage(route);
rendered['/embed'] = renderWithProviders(EmbedPage());

const chrome = [
  renderToStaticMarkup(createElement(Header, { premiumAvailable: true, authAvailable: true })),
  renderToStaticMarkup(createElement(Footer, { premiumAvailable: true })),
].join('\n');

function hrefsIn(html: string): string[] {
  return [...html.matchAll(/\shref="([^"]*)"/g)].map((m) => decode(m[1]));
}

function idsIn(html: string): Set<string> {
  return new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') sourceFiles(full, acc);
    } else if (/\.tsx$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function check(href: string, fromPage: string | null): string | null {
  if (href.startsWith('#')) {
    if (href === '#') return null;
    if (fromPage === null) return `${href}: fragment-only link outside a rendered page`;
    return idsIn(rendered[fromPage]).has(href.slice(1)) ? null : `${href}: no element with that id on ${fromPage}`;
  }
  if (!href.startsWith('/') || href.startsWith('//')) return null;
  const [withoutFragment, fragment] = href.split('#');
  const pathname = withoutFragment.split('?')[0] || '/';
  if (!resolvesToRoute(pathname)) return `${href}: no route for ${pathname}`;
  if (fragment?.includes('=')) {
    return pathname === '/healthcare-bridge' && decodeAges(fragment) !== null
      ? null
      : `${href}: state hash on ${pathname}, which does not read it`;
  }
  if (fragment) {
    const target = rendered[pathname === '' ? '/' : pathname];
    if (!target) return `${href}: cannot verify #${fragment}, ${pathname} is not rendered by this test`;
    if (!idsIn(target).has(fragment)) return `${href}: no element with id ${fragment} on ${pathname}`;
  }
  return null;
}

describe('K10: every internal link resolves to a route, and every fragment to an element', () => {
  it('rendered pages (sitemap, utility and embed) have no dead internal links', () => {
    const problems: string[] = [];
    for (const [page, html] of Object.entries(rendered)) {
      for (const href of new Set(hrefsIn(html))) {
        const problem = check(href, page);
        if (problem) problems.push(`${page} -> ${problem}`);
      }
    }
    expect(problems).toEqual([]);
  });

  it('header and footer (premium and auth links shown) have no dead internal links', () => {
    const problems: string[] = [];
    for (const href of new Set(hrefsIn(chrome))) {
      const problem = check(href, null);
      if (problem) problems.push(`chrome -> ${problem}`);
    }
    expect(problems).toEqual([]);
  });

  it('literal internal hrefs in component and page sources (banner, conditional UI) resolve too', () => {
    const problems: string[] = [];
    let checked = 0;
    const literal = /href(?:=|:\s*)\{?\s*["'](\/[^"'{}$\s]*)["']/g;
    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, 'utf8');
      for (const match of code.matchAll(literal)) {
        checked += 1;
        const problem = check(match[1], null);
        if (problem) problems.push(`${path.relative(SRC, file).split(path.sep).join('/')} -> ${problem}`);
      }
    }
    expect(checked).toBeGreaterThan(50);
    expect(problems).toEqual([]);
  });

  it('the resolver rejects known-dead targets and accepts live ones', () => {
    expect(resolvesToRoute('/guide/what-is-leanfire')).toBe(false);
    expect(resolvesToRoute('/definitely-not-a-page')).toBe(false);
    for (const live of ['/', '/fire-types', '/methodology', '/data.json', '/sitemap.xml', '/logo.png']) {
      expect(resolvesToRoute(live), live).toBe(true);
    }
    expect(check('/fire-types#lean', null)).toBeNull();
    expect(check('/#lean', null)).not.toBeNull();
  });

  it('a state hash is valid only where a page reads it, and only when it decodes (the home next-step link carries one)', () => {
    expect(check('/healthcare-bridge#a=30&ra=54', null)).toBeNull();
    expect(check('/healthcare-bridge#a=5&ra=999', null)).not.toBeNull();
    expect(check('/fire-types#a=30&ra=54', null)).not.toBeNull();
    expect(hrefsIn(rendered['/']).some((href) => href.startsWith('/healthcare-bridge#a='))).toBe(true);
  });

  it('FIRE type cards no longer link to preset hashes the calculator does not read', () => {
    expect(hrefsIn(rendered['/fire-types']).filter((href) => /^\/#/.test(href))).toEqual([]);
  });
});
