import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import noindexPaths from '@/data/noindex-paths.json';
import { isNoindexed, robotsForPath } from '@/lib/noindex-paths';
import { Header } from '@/components/layouts/header';
import { Footer } from '@/components/layouts/footer';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import CalculatorPage from '@/app/(main)/page';
import EmbedPage from '@/app/embed/page';
import * as premiumModule from '@/app/(main)/premium/page';
import sitemap from '@/app/sitemap';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

function withProviders(node: ReactNode) {
  return createElement(QueryClientProvider, { client: new QueryClient() }, createElement(TooltipProvider, null, node));
}

const DEAD_END = /Unlock with Premium|Coming Soon|launching soon|\$4\.99/i;

function stubStripe(configured: boolean) {
  vi.stubEnv('STRIPE_SECRET_KEY', configured ? 'test-stripe-key' : '');
  vi.stubEnv('STRIPE_PREMIUM_PRICE_ID', configured ? 'test-price-id' : '');
}

async function premiumMetadata() {
  const mod = premiumModule as unknown as {
    generateMetadata?: () => Promise<Record<string, unknown>>;
    metadata?: Record<string, unknown>;
  };
  return (mod.generateMetadata ? await mod.generateMetadata() : mod.metadata) as {
    title: string;
    description: string;
    robots: { index: boolean; follow: boolean };
  };
}

beforeEach(() => stubStripe(false));
afterEach(() => vi.unstubAllEnvs());

describe('K1/K10: a plan that cannot be bought is not advertised', () => {
  it('header and footer carry no Premium link when it is not purchasable', () => {
    const header = renderToStaticMarkup(createElement(Header, { premiumAvailable: false }));
    const footer = renderToStaticMarkup(createElement(Footer, { premiumAvailable: false }));
    expect(header).not.toContain('href="/premium"');
    expect(footer).not.toContain('href="/premium"');
  });

  it('header and footer link Premium when it is purchasable', () => {
    const header = renderToStaticMarkup(createElement(Header, { premiumAvailable: true }));
    const footer = renderToStaticMarkup(createElement(Footer, { premiumAvailable: true }));
    expect(header).toContain('href="/premium"');
    expect(footer).toContain('href="/premium"');
  });

  it('the calculator shows no locked Monte Carlo or Portfolio tiles', () => {
    const html = renderToStaticMarkup(withProviders(createElement(CalculatorClient, { premiumAvailable: false })));
    expect(html).not.toMatch(/Premium/);
    expect(html).not.toContain('Monte Carlo Simulation');
    expect(html).not.toContain('asset allocation');
  });

  it('the calculator keeps the locked tiles when Premium is purchasable', () => {
    const html = renderToStaticMarkup(withProviders(createElement(CalculatorClient, { premiumAvailable: true })));
    expect(html).toContain('Unlock with Premium');
  });

  it('home page and embed page render no dead-end copy', async () => {
    expect(renderToStaticMarkup(withProviders(await CalculatorPage()))).not.toMatch(DEAD_END);
    expect(renderToStaticMarkup(withProviders(createElement(EmbedPage)))).not.toMatch(DEAD_END);
  });

  it('/premium says plainly that no plan is offered and renders no button or price', async () => {
    const html = renderToStaticMarkup(await premiumModule.default());
    expect(html).not.toMatch(DEAD_END);
    expect(html).not.toContain('Most Popular');
    expect(html).not.toContain('<button');
    expect(html).toContain('Premium plans are not offered right now');
    expect(html).toContain('href="/"');
  });

  it('/premium keeps the plan table, price and upgrade button when Stripe is configured', async () => {
    stubStripe(true);
    const html = renderToStaticMarkup(await premiumModule.default());
    expect(html).toContain('Most Popular');
    expect(html).toContain('$4.99');
    expect(html).toContain('Upgrade to Premium');
    expect(html).not.toContain('Coming Soon');
  });

  it('/premium metadata is noindex,follow and states no price', async () => {
    for (const configured of [false, true]) {
      stubStripe(configured);
      const meta = await premiumMetadata();
      expect(meta.robots).toMatchObject({ index: false, follow: true });
      expect(`${meta.title} ${meta.description}`).not.toMatch(/\$4\.99|per month|\/mo/i);
    }
  });

  it('the sitemap lists no /premium URL and still lists the content pages', () => {
    const urls = sitemap().map((entry) => entry.url);
    expect(urls.filter((url) => url.includes('/premium'))).toEqual([]);
    expect(urls).toHaveLength(10);
    expect(urls.some((url) => url.endsWith('/fire-guide'))).toBe(true);
  });
});

describe('K8 data-driven noindex list', () => {
  it('every entry names a path, a reason and an ISO date', () => {
    expect(noindexPaths.length).toBeGreaterThan(0);
    for (const entry of noindexPaths) {
      expect(entry.path.startsWith('/')).toBe(true);
      expect(entry.reason.length).toBeGreaterThan(10);
      expect(entry.since).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it('matches paths regardless of trailing slash, query or fragment, and nothing else', () => {
    expect(isNoindexed('/premium')).toBe(true);
    expect(isNoindexed('/premium/')).toBe(true);
    expect(isNoindexed('/premium?plan=x')).toBe(true);
    expect(isNoindexed('/')).toBe(false);
    expect(isNoindexed('/fire-guide')).toBe(false);
  });

  it('robotsForPath is noindex,follow for listed paths and undefined otherwise', () => {
    expect(robotsForPath('/premium')).toEqual({ index: false, follow: true });
    expect(robotsForPath('/fire-guide')).toBeUndefined();
  });
});
