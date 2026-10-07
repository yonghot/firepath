import { createElement, type ReactNode } from 'react';
import type { PageUnderTest } from './hydrate';

export async function home(): Promise<PageUnderTest> {
  const { Providers } = await import('@/components/providers');
  const MainLayout = (await import('@/app/(main)/layout')).default;
  const Page = (await import('@/app/(main)/page')).default;
  const page = (await Page()) as ReactNode;
  return {
    tree: createElement(Providers, null, createElement(MainLayout, null, page)),
    serverComponents: [MainLayout as never, Page as never],
  };
}
