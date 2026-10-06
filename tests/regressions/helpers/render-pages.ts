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
  '/contact': () => import('@/app/(main)/contact/page'),
  '/premium': () => import('@/app/(main)/premium/page'),
  '/embed-this': () => import('@/app/(main)/embed-this/page'),
};

export function renderWithProviders(node: ReactNode): string {
  return renderToStaticMarkup(
    createElement(QueryClientProvider, { client: new QueryClient() }, createElement(TooltipProvider, null, node)),
  );
}

export async function renderPage(path: string): Promise<string> {
  const load = PAGE_LOADERS[path];
  if (!load) throw new Error(`no page loader registered for ${path}`);
  const page = await load();
  return renderWithProviders(await page.default());
}
