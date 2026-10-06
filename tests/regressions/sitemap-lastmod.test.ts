import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sitemap from '@/app/sitemap';
import { getIndexablePages, type ContentPage } from '@/lib/content-pages';

const SITEMAP_SOURCE = readFileSync(join(__dirname, '..', '..', 'src', 'app', 'sitemap.ts'), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .replace(/^\s*\/\/.*$/gm, '');

const pathOf = (url: string) => new URL(url).pathname;

function registryDateFor(path: string): string | undefined {
  return getIndexablePages().find((page) => page.canonicalPath === path)?.lastModified;
}

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock('@/lib/content-pages');
  vi.resetModules();
});

describe('K3: sitemap lastmod is a real per-page change date, never the build clock', () => {
  it('sitemap.ts never reads the clock', () => {
    expect(SITEMAP_SOURCE).not.toMatch(/new Date\(|Date\.now\(/);
  });

  it('every entry carries exactly the registry date of its page, or none when the registry has none', () => {
    for (const entry of sitemap()) {
      const expected = registryDateFor(pathOf(entry.url));
      if (expected === undefined) expect(entry, entry.url).not.toHaveProperty('lastModified');
      else expect(entry.lastModified, entry.url).toBe(expected);
    }
  });

  it('registry dates are real calendar dates (YYYY-MM-DD) and none is in the future', () => {
    const today = new Date();
    const latestAllowed = [today.toISOString().slice(0, 10), today.toLocaleDateString('en-CA')].sort().at(-1) as string;
    const dated = getIndexablePages().filter((page) => page.lastModified !== undefined);
    expect(dated.length).toBeGreaterThan(0);
    for (const page of dated) {
      const value = page.lastModified as string;
      expect(value, page.path).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10), page.path).toBe(value);
      expect(value <= latestAllowed, `${page.path} ${value} is after today`).toBe(true);
    }
  });

  it('the values do not move with the clock', () => {
    const before = sitemap().map((entry) => entry.lastModified);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-03-04T05:06:07Z'));
    const after = sitemap().map((entry) => entry.lastModified);
    expect(after).toEqual(before);
    for (const value of after) expect(String(value ?? '')).not.toContain('2031');
  });

  it('different pages carry different dates and an undated page carries none', async () => {
    const page = (path: string, lastModified?: string): ContentPage => ({
      path,
      canonicalPath: path,
      title: path,
      description: path,
      fireType: null,
      hasUniqueData: true,
      kind: 'core',
      ...(lastModified ? { lastModified } : {}),
    });
    vi.resetModules();
    vi.doMock('@/lib/content-pages', () => ({
      getIndexablePages: () => [page('/', '2026-07-01'), page('/a', '2026-08-15'), page('/b')],
    }));
    const { default: mockedSitemap } = await import('@/app/sitemap');
    const entries = mockedSitemap();
    const byPath = Object.fromEntries(entries.map((entry) => [pathOf(entry.url), entry]));
    expect(byPath['/'].lastModified).toBe('2026-07-01');
    expect(byPath['/a'].lastModified).toBe('2026-08-15');
    expect(byPath['/b']).not.toHaveProperty('lastModified');
    expect(new Set(entries.map((entry) => entry.lastModified)).size).toBeGreaterThan(1);
  });
});
