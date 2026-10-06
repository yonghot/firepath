import { describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'font-sans', className: 'font-sans' }) }));

const SRC = join(__dirname, '..', '..', 'src');

const IDENTIFIERS = [
  'annualExpenses',
  'realReturn',
  'growthRate',
  'bridgeYears',
  'nextNetWorth',
  'CoastTarget',
  'RegularTarget',
  'yearsToRetirement',
  'totalCost',
  'calculateFIRE',
  'calculateHealthcareBridge',
];

const FORBIDDEN: { name: string; re: RegExp }[] = [
  { name: 'camelCase identifier', re: /\b[a-z]{2,}[A-Z][A-Za-z]*\b/ },
  { name: 'function call text', re: /\b[A-Za-z]+\(\)/ },
  { name: 'engine', re: /\b(?<!search )engines?\b/i },
  { name: 'fabricat*', re: /fabricat/i },
  { name: 'site configuration', re: /this site'?s configuration/i },
  { name: 'implementation vocabulary', re: /\b(unit tests?|regression tests?|test suite|config(uration)? file|environment variables?|the repo(sitory)?)\b/i },
];

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
      .replace(/<pre[\s\S]*?<\/pre>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  );

function cellTexts(html: string): string[] {
  return [...html.matchAll(/<(?:td|th|li|dd)[^>]*>([\s\S]*?)<\/(?:td|th|li|dd)>/g)].map((m) => visibleText(m[1]).trim());
}

function ldStrings(html: string): string[] {
  const out: string[] = [];
  const collect = (value: unknown): void => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) if (!key.startsWith('@')) collect(child);
    }
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) collect(JSON.parse(m[1]));
  return out.filter((s) => !/^https?:\/\//.test(s));
}

function metadataStrings(meta: unknown): string[] {
  const out: string[] = [];
  const collect = (value: unknown, key = ''): void => {
    if (typeof value === 'string') {
      if (!/^(canonical|url|images|siteName|locale|type|card)$/.test(key)) out.push(value);
    } else if (Array.isArray(value)) value.forEach((v) => collect(v, key));
    else if (value && typeof value === 'object') Object.entries(value).forEach(([k, v]) => collect(v, k));
  };
  collect(meta);
  return out.filter((s) => !/^https?:\/\//.test(s) && !s.startsWith('/'));
}

function findings(label: string, strings: string[]): string[] {
  const hits: string[] = [];
  for (const text of strings) {
    for (const id of IDENTIFIERS) if (text.includes(id)) hits.push(`${label}: identifier ${id}`);
    for (const { name, re } of FORBIDDEN) {
      const m = re.exec(text);
      if (m) hits.push(`${label}: ${name} "${m[0]}" in "${text.slice(Math.max(0, m.index - 40), m.index + 60).trim()}"`);
    }
  }
  return hits;
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

describe('K2: readers see formulas in plain words, never code or implementation talk', () => {
  const paths = Object.keys(PAGE_LOADERS);

  it('covers the sitemap pages plus the utility pages', () => {
    expect(paths.length).toBeGreaterThanOrEqual(11);
  });

  for (const path of paths) {
    it(`${path}: visible text, structured data and metadata carry no identifiers or engine talk`, async () => {
      const html = await renderPage(path);
      const mod = (await PAGE_LOADERS[path]()) as { metadata?: unknown };
      const hits = [
        ...findings('visible', [visibleText(html)]),
        ...findings('ld+json', ldStrings(html)),
        ...findings('metadata', metadataStrings(mod.metadata)),
      ];
      expect(hits).toEqual([]);
    });

    it(`${path}: no table cell or list item is a bare route`, async () => {
      const raw = cellTexts(await renderPage(path)).filter((t) => /^\/[a-z0-9-]+(#[a-z0-9-]+)?$/.test(t));
      expect(raw).toEqual([]);
    });
  }

  it('the root layout structured data and visible text carry no identifiers or engine talk', async () => {
    const { default: RootLayout } = await import('@/app/layout');
    const html = renderToStaticMarkup(createElement(RootLayout, null, createElement('main', null, 'page')));
    expect([...findings('visible', [visibleText(html)]), ...findings('ld+json', ldStrings(html))]).toEqual([]);
  });


  it('no shipped source writes defensive "fabricated" copy or calls the calculator an engine in reader text', () => {
    const offenders: string[] = [];
    for (const file of shippedSources(SRC)) {
      if (file.endsWith(join('lib', 'analytics.ts'))) continue;
      stripComments(readFileSync(file, 'utf8'))
        .split('\n')
        .forEach((line, i) => {
          if (/from\s+['"][^'"]*\/engine\//.test(line)) return;
          if (/fabricat|\b(?<!search )engines?\b/i.test(line)) {
            offenders.push(`${file.slice(SRC.length + 1)}:${i + 1}: ${line.trim().slice(0, 100)}`);
          }
        });
    }
    expect(offenders).toEqual([]);
  });
});
