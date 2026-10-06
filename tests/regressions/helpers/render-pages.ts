import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

type PageModule = { default: () => ReactNode | Promise<ReactNode> };

export const PAGE_LOADERS: Record<string, () => Promise<PageModule>> = {
  '/': () => import('@/app/(main)/page'),
  '/about': () => import('@/app/(main)/about/page'),
  '/fire-guide': () => import('@/app/(main)/fire-guide/page'),
  '/fire-statistics': () => import('@/app/(main)/fire-statistics/page'),
  '/fire-types': () => import('@/app/(main)/fire-types/page'),
  '/guide': () => import('@/app/(main)/guide/page'),
  '/healthcare-bridge': () => import('@/app/(main)/healthcare-bridge/page'),
  '/methodology': () => import('@/app/(main)/methodology/page'),
  '/privacy': () => import('@/app/(main)/privacy/page'),
  '/terms': () => import('@/app/(main)/terms/page'),
  '/contact': () => import('@/app/(utility)/contact/page'),
  '/premium': () => import('@/app/(utility)/premium/page'),
  '/embed-this': () => import('@/app/(utility)/embed-this/page'),
};

export function renderWithProviders(node: ReactNode): string {
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() }, createElement(TooltipProvider, null, node)),
  );
}

const loaded = new Map<string, Promise<PageModule>>();

function loadPage(path: string): Promise<PageModule> {
  const load = PAGE_LOADERS[path];
  if (!load) throw new Error(`no page loader registered for ${path}`);
  if (!loaded.has(path)) loaded.set(path, load());
  return loaded.get(path) as Promise<PageModule>;
}

export async function preloadPages(paths: string[] = Object.keys(PAGE_LOADERS)): Promise<void> {
  await Promise.all(paths.map(loadPage));
}

export async function renderPage(path: string): Promise<string> {
  const page = await loadPage(path);
  return renderWithProviders(await page.default());
}
