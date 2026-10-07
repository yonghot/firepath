import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderThenHydrate, type PageUnderTest } from './helpers/hydrate';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

type PageFunction = (props: object) => ReactNode | Promise<ReactNode>;
type Loader = () => Promise<{ default: (props: never) => ReactNode | Promise<ReactNode> }>;

const PAGES: Record<string, { page: Loader; layout: Loader }> = {
  '/': { page: () => import('@/app/(main)/page'), layout: () => import('@/app/(main)/layout') },
  '/about': { page: () => import('@/app/(main)/about/page'), layout: () => import('@/app/(main)/layout') },
  '/fire-guide': { page: () => import('@/app/(main)/fire-guide/page'), layout: () => import('@/app/(main)/layout') },
  '/fire-statistics': { page: () => import('@/app/(main)/fire-statistics/page'), layout: () => import('@/app/(main)/layout') },
  '/fire-types': { page: () => import('@/app/(main)/fire-types/page'), layout: () => import('@/app/(main)/layout') },
  '/guide': { page: () => import('@/app/(main)/guide/page'), layout: () => import('@/app/(main)/layout') },
  '/healthcare-bridge': { page: () => import('@/app/(main)/healthcare-bridge/page'), layout: () => import('@/app/(main)/layout') },
  '/methodology': { page: () => import('@/app/(main)/methodology/page'), layout: () => import('@/app/(main)/layout') },
  '/privacy': { page: () => import('@/app/(main)/privacy/page'), layout: () => import('@/app/(main)/layout') },
  '/terms': { page: () => import('@/app/(main)/terms/page'), layout: () => import('@/app/(main)/layout') },
  '/result': { page: () => import('@/app/(main)/result/page'), layout: () => import('@/app/(main)/layout') },
  '/contact': { page: () => import('@/app/(utility)/contact/page'), layout: () => import('@/app/(utility)/layout') },
  '/embed-this': { page: () => import('@/app/(utility)/embed-this/page'), layout: () => import('@/app/(utility)/layout') },
};

const PAGE_SOURCES = import.meta.glob('/src/app/**/page.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

function componentsDeclaredIn(path: string): string[] {
  const wanted = '/src/app' + (path === '/' ? '' : path) + '/page.tsx';
  const file = Object.keys(PAGE_SOURCES).find((key) => key.replace(/\/\(\w+\)/g, '') === wanted);
  const source = file ? PAGE_SOURCES[file] : '';
  return [...source.matchAll(/^(?:async\s+)?function\s+([A-Z]\w*)/gm), ...source.matchAll(/^const\s+([A-Z]\w*)\s*=\s*\(/gm)].map((m) => m[1]);
}

const BUILD_TIME = new Date('2026-08-31T12:00:00Z');
const BROWSER = {
  now: new Date('2026-10-08T00:10:00Z'),
  timeZone: 'America/New_York',
  locale: 'de-DE',
  storage: {},
  url: 'https://gofirepath.com/',
};

function under(path: string) {
  return async (): Promise<PageUnderTest> => {
    const { Providers } = await import('@/components/providers');
    const Layout = (await PAGES[path].layout()).default as PageFunction;
    const Page = (await PAGES[path].page()).default as PageFunction;
    const page = await Page({});
    return {
      tree: createElement(Providers, null, createElement(Layout as never, null, page)),
      serverComponents: [Layout as never, Page as never],
      serverComponentNames: componentsDeclaredIn(path),
    };
  };
}

describe('every content page hydrates cleanly for a visitor in another time zone and locale (React error 418)', () => {
  for (const path of Object.keys(PAGES)) {
    it(path, async () => {
      expect((await renderThenHydrate(under(path), BUILD_TIME, BROWSER)).problems).toEqual([]);
    }, 120_000);
  }
});
