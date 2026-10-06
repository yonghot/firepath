import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { getIndexablePages } from '@/lib/content-pages';
import * as figures from '@/lib/figures';
import { GET as getDataJson } from '@/app/data.json/route';
import { GET as getDataCsv } from '@/app/data.csv/route';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'font-sans', className: 'font-sans' }) }));

const ROOT = join(__dirname, '..', '..');
const SRC = join(ROOT, 'src');
const OLD_GLOBAL_DATE = '2026-06-29';
const DATED_PATHS = ['/', '/guide', '/fire-types', '/healthcare-bridge', '/fire-statistics', '/fire-guide', '/methodology'];

const registryDate = (path: string): string | undefined =>
  getIndexablePages().find((page) => page.canonicalPath === path)?.lastModified;

const sourceChecks = (figures as { SOURCE_CHECKS?: Record<string, { date: string }> }).SOURCE_CHECKS ?? {};
const assumptionsAsOf = (figures as { CORE_ASSUMPTIONS_AS_OF?: string }).CORE_ASSUMPTIONS_AS_OF;

const decode = (s: string) => s.replace(/&#x27;|&apos;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');

const visibleText = (html: string) =>
  decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' '),
  );

function timeValues(html: string): string[] {
  return [...html.matchAll(/<time[^>]*?dateTime="([^"]+)"/g)].map((m) => m[1]);
}

function withoutTables(html: string): string {
  return html.replace(/<table[\s\S]*?<\/table>/g, ' ');
}

function ldDateModified(html: string): string[] {
  const out: string[] = [];
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) value.forEach(collect);
    else if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        if (key === 'dateModified' && typeof child === 'string') out.push(child);
        else collect(child);
      }
    }
  };
  for (const m of html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) collect(JSON.parse(m[1]));
  return out;
}

function shippedSources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : shippedSources(path);
    return /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

await preloadPages();

describe('K3/K30: visible dates come from the page registry and "checked" needs a record', () => {
  it('the registry dates the pages that show a date, and the three rewritten pages are later than the old global date', () => {
    for (const path of DATED_PATHS) expect(registryDate(path), path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const path of ['/fire-types', '/healthcare-bridge', '/fire-statistics']) {
      expect((registryDate(path) as string) > OLD_GLOBAL_DATE, path).toBe(true);
    }
  });

  for (const path of DATED_PATHS) {
    it(`${path}: every date shown outside a source-check table is the registry date`, async () => {
      const html = await renderPage(path);
      const shown = timeValues(withoutTables(html));
      expect(shown.length, `${path} shows no date`).toBeGreaterThan(0);
      expect(new Set(shown)).toEqual(new Set([registryDate(path)]));
    });
  }

  for (const path of ['/', '/fire-statistics', '/fire-guide']) {
    it(`${path}: structured-data dateModified equals the visible date`, async () => {
      const modified = ldDateModified(await renderPage(path));
      expect(modified.length, `${path} has no dateModified`).toBeGreaterThan(0);
      for (const value of modified) expect(value).toBe(registryDate(path));
    });
  }

  it('no page shows the old global date outside the methodology assumptions table', async () => {
    for (const path of Object.keys(PAGE_LOADERS)) {
      const html = withoutTables(await renderPage(path));
      expect(timeValues(html), path).not.toContain(OLD_GLOBAL_DATE);
      expect(visibleText(html), path).not.toMatch(/June 29, 2026|2026-06-29/);
    }
  });

  it('"verified" and "checked against" claims appear only in methodology table rows backed by a source check', async () => {
    for (const path of Object.keys(PAGE_LOADERS)) {
      const html = await renderPage(path);
      expect(visibleText(withoutTables(html)), path).not.toMatch(/\bverified\b|checked against/i);
    }
    const checkDates = new Set(Object.values(sourceChecks).map((check) => check.date));
    expect(checkDates.size).toBeGreaterThan(0);
    const rows = [...(await renderPage('/methodology')).matchAll(/<tr[\s\S]*?<\/tr>/g)].map((m) => m[0]);
    const claimRows = rows.filter((row) => /\bverified\b|checked against/i.test(visibleText(row)));
    expect(claimRows.length).toBeGreaterThanOrEqual(2);
    for (const row of claimRows) expect(timeValues(row).some((value) => checkDates.has(value))).toBe(true);
  });

  it('the assumptions "as of" date lives only in figures.ts and the methodology page', () => {
    expect(assumptionsAsOf).toBe(OLD_GLOBAL_DATE);
    const users = shippedSources(SRC)
      .filter((file) => /CORE_ASSUMPTIONS_AS_OF/.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => file.slice(SRC.length + 1).replace(/\\/g, '/'));
    expect(users.sort()).toEqual(['app/(main)/methodology/page.tsx', 'lib/figures.ts']);
  });

  it('no shipped source keeps a hand-typed page date or the old "verified" names', () => {
    const offenders = shippedSources(SRC)
      .filter((file) => {
        const src = stripComments(readFileSync(file, 'utf8'));
        return (
          /const\s+(LAST_UPDATED|GUIDE_UPDATED)\s*=\s*['"]\d{4}-\d{2}-\d{2}['"]/.test(src) ||
          /CORE_ASSUMPTIONS_LAST_VERIFIED|dataVerifiedDate|data_verified_date|getFiguresLastUpdated/.test(src)
        );
      })
      .map((file) => file.slice(SRC.length + 1));
    expect(offenders).toEqual([]);
  });

  it('the Open Graph images stamp the page registry date', () => {
    const files = [
      'app/(main)/opengraph-image.tsx',
      'app/(main)/fire-types/opengraph-image.tsx',
      'app/(main)/healthcare-bridge/opengraph-image.tsx',
      'app/(main)/fire-statistics/opengraph-image.tsx',
    ];
    for (const file of files) {
      const src = stripComments(readFileSync(join(SRC, file), 'utf8'));
      expect(src, file).toMatch(/lastUpdated:\s*getPageLastModified\(/);
    }
  });

  it('the data feeds name their date column last_updated and carry the page registry date', async () => {
    const date = registryDate('/fire-statistics') as string;
    const json = JSON.parse(await getDataJson().text());
    expect(json.lastUpdated).toBe(date);
    expect(json).not.toHaveProperty('dataVerifiedDate');
    const lines = (await getDataCsv().text()).trim().split('\n');
    expect(lines[0].split(',').at(-1)).toBe('last_updated');
    for (const line of lines.slice(1)) expect(line.split(',').at(-1)).toBe(date);
  });

  it('docs/source-checks.md has a dated row for every source check the site relies on', () => {
    const doc = readFileSync(join(ROOT, 'docs/source-checks.md'), 'utf8');
    const entries = Object.entries(sourceChecks);
    expect(entries.length).toBeGreaterThan(0);
    for (const [id, check] of entries) {
      expect(doc, id).toMatch(new RegExp(`\\| ${id} \\|[^\\n]*\\| ${check.date} \\|`));
    }
  });
});
