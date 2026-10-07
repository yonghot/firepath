import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { tryToParsePath } from 'next/dist/lib/try-to-parse-path';
import nextConfig from '../../next.config';
import EmbedPage from '@/app/embed/page';
import { ResultDisclaimer } from '@/components/compliance/ResultDisclaimer';
import { ResultRelated } from '@/components/features/calculator/result-related';
import { MonteCarloPanel } from '@/components/features/monte-carlo/monte-carlo-panel';
import { PortfolioPanel } from '@/components/features/portfolio/portfolio-panel';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { renderWithProviders } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const ROOT = path.resolve(__dirname, '../..');

type HeaderRule = { source: string; headers: { key: string; value: string }[] };

async function headerRules(): Promise<HeaderRule[]> {
  return (await nextConfig.headers?.()) as HeaderRule[];
}

function matches(source: string, pathname: string): boolean {
  return getPathMatch(source)(pathname) !== false;
}

function internalAnchors(html: string): string[] {
  return [...html.matchAll(/<a\s[^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /\shref="\/(?!\/)/.test(tag));
}

afterEach(() => vi.unstubAllEnvs());

describe('K21: security headers skip only the embeddable route', () => {
  it('every header source is a valid path pattern for Next', async () => {
    for (const rule of await headerRules()) {
      const parsed = tryToParsePath(rule.source);
      expect(parsed.error, rule.source).toBeUndefined();
    }
  });

  it('frame-blocking headers apply to content pages, including /embed-this and /embed-thing', async () => {
    const rules = await headerRules();
    const framing = rules.find((rule) => rule.headers.some((h) => h.key === 'X-Frame-Options'));
    expect(framing).toBeDefined();
    const source = (framing as HeaderRule).source;
    for (const pathname of ['/', '/methodology', '/premium', '/embed-this', '/embed-thing', '/embeds']) {
      expect(matches(source, pathname), pathname).toBe(true);
    }
  });

  it('the embeddable widget route and its children get no frame-blocking header', async () => {
    const rules = await headerRules();
    const framing = rules.find((rule) => rule.headers.some((h) => h.key === 'X-Frame-Options'));
    const source = (framing as HeaderRule).source;
    for (const pathname of ['/embed', '/embed/x', '/embed/x/y']) {
      expect(matches(source, pathname), pathname).toBe(false);
    }
  });

  it('no rule frames a page with DENY or frame-ancestors none', async () => {
    const serialised = JSON.stringify(await headerRules());
    expect(serialised).not.toMatch(/DENY/i);
    expect(serialised).not.toMatch(/frame-ancestors/i);
  });

  it('K16 guard: no Permissions-Policy blocks browsing-topics in any header source', async () => {
    const files = ['next.config.ts', 'middleware.ts', 'vercel.json', path.join('src', 'lib', 'supabase', 'middleware.ts')];
    for (const file of files) {
      const full = path.join(ROOT, file);
      if (!existsSync(full)) continue;
      expect(readFileSync(full, 'utf8'), file).not.toMatch(/browsing-topics\s*=\s*\(\s*\)/);
    }
    const serialised = JSON.stringify(await headerRules());
    expect(serialised).not.toMatch(/browsing-topics/);
  });
});

describe('FIRE-25: links inside the embed open outside the frame', () => {
  it('the embed page has no same-origin anchor without target=_blank and noopener', () => {
    for (const premiumConfigured of [false, true]) {
      vi.stubEnv('STRIPE_SECRET_KEY', premiumConfigured ? 'test-stripe-key' : '');
      vi.stubEnv('STRIPE_PREMIUM_PRICE_ID', premiumConfigured ? 'test-price-id' : '');
      const anchors = internalAnchors(renderWithProviders(EmbedPage()));
      expect(anchors.length, `premium configured: ${premiumConfigured}`).toBeGreaterThan(0);
      for (const tag of anchors) {
        expect(tag).toMatch(/\starget="_blank"/);
        expect(tag).toMatch(/\srel="[^"]*noopener/);
      }
    }
  });

  it('the result module that appears after the first interaction follows the same rule', () => {
    const output = calculateFIRE(DEFAULT_INPUT);
    const embedded = internalAnchors(
      renderToStaticMarkup(createElement(ResultRelated, { hasResult: true, output, embedded: true })),
    );
    expect(embedded.length).toBeGreaterThanOrEqual(3);
    for (const tag of embedded) {
      expect(tag).toMatch(/\starget="_blank"/);
      expect(tag).toMatch(/\srel="[^"]*noopener/);
    }
  });

  it('the locked premium tiles follow the same rule when shown in the embed', () => {
    const output = calculateFIRE(DEFAULT_INPUT);
    for (const panel of [MonteCarloPanel, PortfolioPanel]) {
      const tags = internalAnchors(
        renderToStaticMarkup(createElement(panel, { input: DEFAULT_INPUT, results: output.results, embedded: true })),
      );
      expect(tags.length).toBeGreaterThan(0);
      for (const tag of tags) expect(tag).toMatch(/\starget="_blank"/);
    }
  });

  it('the main site keeps in-page navigation: no target on the same links', () => {
    const output = calculateFIRE(DEFAULT_INPUT);
    const html = [
      renderToStaticMarkup(createElement(ResultDisclaimer)),
      renderToStaticMarkup(createElement(ResultRelated, { hasResult: true, output })),
    ].join('');
    const anchors = internalAnchors(html);
    expect(anchors.length).toBeGreaterThan(3);
    for (const tag of anchors) expect(tag).not.toMatch(/\starget=/);
  });
});
