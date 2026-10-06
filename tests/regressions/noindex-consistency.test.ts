import { describe, expect, it, vi } from 'vitest';
import type { Metadata } from 'next';
import noindexEntries from '@/data/noindex-paths.json';
import sitemap from '@/app/sitemap';
import { getIndexablePages } from '@/lib/content-pages';
import { isNoindexed } from '@/lib/noindex-paths';
import { PAGE_LOADERS, preloadPages } from './helpers/render-pages';
import { staticRoutes } from './helpers/app-routes';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'font-sans', className: 'font-sans' }) }));

await preloadPages();

type PageModule = { metadata?: Metadata; generateMetadata?: () => Promise<Metadata> | Metadata };

async function pageRobots(path: string): Promise<Record<string, unknown> | undefined> {
  const mod = (await PAGE_LOADERS[path]()) as PageModule;
  const meta = mod.generateMetadata ? await mod.generateMetadata() : mod.metadata;
  return meta?.robots as Record<string, unknown> | undefined;
}

const THIN_UTILITY_PATHS = ['/premium', '/contact', '/embed-this'];
const NOINDEXED_PATHS = [...new Set([...THIN_UTILITY_PATHS, ...noindexEntries.map((entry) => entry.path)])];

describe('K8/K10: the noindex list, the page robots and the sitemap agree', () => {
  it('lists the thin utility pages and not the guide hub', () => {
    expect(noindexEntries.map((entry) => entry.path)).toEqual(expect.arrayContaining(THIN_UTILITY_PATHS));
    expect(NOINDEXED_PATHS).not.toContain('/guide');
    expect(new Set(noindexEntries.map((entry) => entry.path)).size).toBe(noindexEntries.length);
  });

  it('every entry is an existing route with a reason and a date', () => {
    const routes = staticRoutes();
    for (const entry of noindexEntries) {
      expect(routes.has(entry.path), `${entry.path} is not a route`).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(20);
      expect(entry.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  for (const path of NOINDEXED_PATHS) {
    it(`${path}: page metadata is noindex,follow`, async () => {
      expect(PAGE_LOADERS[path], `no page loader registered for ${path}`).toBeDefined();
      const robots = await pageRobots(path);
      expect(robots).toMatchObject({ index: false, follow: true });
    });

    it(`${path}: absent from the sitemap and from the indexable content registry`, () => {
      const urls = sitemap().map((item) => new URL(item.url).pathname);
      expect(urls).not.toContain(path);
      expect(getIndexablePages().map((page) => page.canonicalPath)).not.toContain(path);
    });
  }

  it('every page that declares noindex is on the list, and every other page is indexable', async () => {
    for (const path of Object.keys(PAGE_LOADERS)) {
      const robots = await pageRobots(path);
      const declaresNoindex = robots?.index === false;
      expect(declaresNoindex, `${path}: metadata robots vs noindex list`).toBe(isNoindexed(path));
    }
  });

  it('the guide hub stays indexable and in the sitemap', async () => {
    expect(await pageRobots('/guide')).toMatchObject({ index: true });
    expect(sitemap().map((item) => new URL(item.url).pathname)).toContain('/guide');
  });
});
