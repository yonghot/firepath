import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { PUBLISHER } from '@/lib/site';
import { Footer } from '@/components/layouts/footer';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'font-sans', className: 'font-sans' }) }));

const SRC = join(__dirname, '..', '..', 'src');
const FORBIDDEN_TEXT = /Editorial Team|Reviewed for accuracy|reviewed by our/i;
const FORBIDDEN_KEYS = new Set(['reviewedBy', 'lastReviewed', 'potentialAction']);
const IDENTITY_KEYS = ['author', 'publisher', 'creator'];

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };

function ldJsonNodes(html: string): Json[] {
  return [...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]) as Json);
}

function walk(node: Json, visit: (key: string | null, value: Json, parent: Json | null) => void, key: string | null = null, parent: Json | null = null): void {
  visit(key, node, parent);
  if (Array.isArray(node)) node.forEach((child) => walk(child, visit, key, node));
  else if (node && typeof node === 'object') Object.entries(node).forEach(([k, child]) => walk(child, visit, k, node));
}

function shippedSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : shippedSources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

await preloadPages();
const { default: RootLayout } = await import('@/app/layout');

function renderRootLayout(): string {
  return renderToStaticMarkup(createElement(RootLayout, null, createElement('main', null, 'page')));
}

describe('K6/K30: identity claims name the publisher and nothing the site cannot back', () => {
  const paths = Object.keys(PAGE_LOADERS);

  it('covers the sitemap pages plus the utility pages', () => {
    expect(paths.length).toBeGreaterThanOrEqual(11);
  });

  for (const path of paths) {
    it(`${path}: no Person, reviewer, editorial-team or search-action claims; publisher resolves to Actigence`, async () => {
      const html = await renderPage(path);
      expect(html).not.toMatch(FORBIDDEN_TEXT);
      for (const node of ldJsonNodes(html)) assertNodeIdentity(node, path);
    });
  }

  it('the root layout emits no Person, no self-referencing FIREPath Organization and no SearchAction', () => {
    const html = renderRootLayout();
    const nodes = ldJsonNodes(html);
    expect(nodes.length).toBeGreaterThanOrEqual(3);
    for (const node of nodes) assertNodeIdentity(node, 'root layout');
    const organizations: string[] = [];
    nodes.forEach((node) =>
      walk(node, (_key, value) => {
        if (value && typeof value === 'object' && !Array.isArray(value) && value['@type'] === 'Organization') {
          organizations.push(String(value.name));
        }
      }),
    );
    expect(organizations.length).toBeGreaterThan(0);
    expect(new Set(organizations)).toEqual(new Set([PUBLISHER.name]));
  });

  it('no shipped source builds a Person node, reviewer properties or a SearchAction', () => {
    const offenders = shippedSources(SRC).filter((file) => {
      const src = stripComments(readFileSync(file, 'utf8'));
      return (
        /['"]@type['"]\s*:\s*['"]Person['"]/.test(src) ||
        /SearchAction|reviewedBy|lastReviewed/.test(src) ||
        FORBIDDEN_TEXT.test(src)
      );
    });
    expect(offenders.map((file) => file.slice(SRC.length + 1))).toEqual([]);
  });

  it('no shipped source names FIREPath as the author, publisher or creator of its own content', () => {
    const offenders = shippedSources(SRC).filter((file) => {
      const src = stripComments(readFileSync(file, 'utf8'));
      return /(author|publisher|creator)\s*:\s*\{[^}]*name:\s*['"]FIREPath['"]/.test(src);
    });
    expect(offenders.map((file) => file.slice(SRC.length + 1))).toEqual([]);
  });
});

const visibleText = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\s+([.,;:])/g, '$1');

describe('K6: the publisher is named where readers look for who is behind the site', () => {
  it('the footer names the publisher and carries no build-frozen year', () => {
    const text = visibleText(renderToStaticMarkup(createElement(Footer, { premiumAvailable: false })));
    expect(text).toContain(`Published by ${PUBLISHER.name}`);
    expect(text).not.toMatch(/\u00a9\s*\d{4}/);
  });

  for (const path of ['/about', '/terms', '/privacy', '/contact']) {
    it(`${path} names the publisher`, async () => {
      expect(visibleText(await renderPage(path))).toContain(PUBLISHER.name);
    });
  }

  it('About, Terms and Privacy say FIREPath is published by the publisher; About gives the correction route', async () => {
    const about = visibleText(await renderPage('/about'));
    expect(about).toContain(`FIREPath is published by ${PUBLISHER.name}`);
    expect(about).toContain(PUBLISHER.correctionRequest);
    expect(visibleText(await renderPage('/terms'))).toContain(`FIREPath is published by ${PUBLISHER.name}`);
    expect(visibleText(await renderPage('/privacy'))).toContain(`is published by ${PUBLISHER.name}`);
  });

  it('Terms and Privacy do not invent corporate officers or directors', async () => {
    for (const path of ['/terms', '/privacy']) {
      expect(visibleText(await renderPage(path)), path).not.toMatch(/officers,\s*directors/i);
    }
  });

  it('the publisher name and address are typed only in the PUBLISHER slot', () => {
    const offenders = shippedSources(SRC)
      .filter((file) => !file.endsWith(join('lib', 'site.ts')))
      .filter((file) => /actigence/i.test(stripComments(readFileSync(file, 'utf8'))));
    expect(offenders.map((file) => file.slice(SRC.length + 1))).toEqual([]);
  });
});

function assertNodeIdentity(node: Json, where: string): void {
  walk(node, (key, value) => {
    if (key && FORBIDDEN_KEYS.has(key)) throw new Error(`${where}: forbidden property ${key}`);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if (value['@type'] === 'Person') throw new Error(`${where}: Person node`);
      if (value['@type'] === 'SearchAction') throw new Error(`${where}: SearchAction node`);
      if (key && IDENTITY_KEYS.includes(key)) {
        expect(value, `${where}: ${key}`).toMatchObject({ '@type': 'Organization', name: PUBLISHER.name, url: PUBLISHER.url });
      }
    }
  });
}
