import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../..');
const SRC = path.join(ROOT, 'src');
const SITE_MODULE = 'lib/site.ts';
const ORIGIN_LITERAL_ALLOWED = new Set([SITE_MODULE, 'app/(main)/privacy/page.tsx', 'app/(main)/terms/page.tsx']);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      sourceFiles(full, acc);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(entry.name) && !/\.test\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function rel(file: string): string {
  return path.relative(SRC, file).split(path.sep).join('/');
}

function offenders(pattern: RegExp, allowed: Set<string> = new Set([SITE_MODULE])): string[] {
  const found: string[] = [];
  for (const file of sourceFiles(SRC)) {
    const name = rel(file);
    if (allowed.has(name)) continue;
    if (pattern.test(stripComments(readFileSync(file, 'utf8')))) found.push(name);
  }
  return found.sort();
}

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
  vi.resetModules();
  vi.doUnmock('@/lib/stripe/server');
});

function setAppUrl(value: string | undefined): void {
  vi.resetModules();
  if (value === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = value;
}

describe('K20/K15: one SITE_URL source', () => {
  it('only src/lib/site.ts reads NEXT_PUBLIC_APP_URL', () => {
    expect(offenders(/NEXT_PUBLIC_APP_URL/)).toEqual([]);
    for (const file of ['next.config.ts', 'middleware.ts']) {
      expect(readFileSync(path.join(ROOT, file), 'utf8'), file).not.toMatch(/NEXT_PUBLIC_APP_URL/);
    }
  });

  it('no localhost fallback ships in non-test source', () => {
    expect(offenders(/localhost:3000/, new Set())).toEqual([]);
  });

  it('the production origin is a literal only in the site module and the two legal documents that name the site', () => {
    expect(offenders(/https:\/\/gofirepath\.com/, ORIGIN_LITERAL_ALLOWED)).toEqual([]);
  });

  it('scripts/indexnow.mjs keeps its own fallback equal to the SITE_URL default', async () => {
    const script = readFileSync(path.join(ROOT, 'scripts', 'indexnow.mjs'), 'utf8');
    const match = script.match(/process\.env\.NEXT_PUBLIC_APP_URL \|\| '([^']+)'/);
    expect(match, 'indexnow.mjs fallback').not.toBeNull();
    setAppUrl(undefined);
    const site = await import('@/lib/site');
    expect(match?.[1]).toBe(site.SITE_URL);
  });

  it.each([
    [undefined, 'https://gofirepath.com'],
    ['', 'https://gofirepath.com'],
    ['https://staging.example.test/', 'https://staging.example.test'],
  ])('robots and sitemap follow SITE_URL for NEXT_PUBLIC_APP_URL=%j', async (value, expected) => {
    setAppUrl(value);
    const robots = (await import('@/app/robots')).default();
    expect(robots.sitemap).toBe(`${expected}/sitemap.xml`);
    const entries = (await import('@/app/sitemap')).default();
    expect(entries.length).toBeGreaterThan(5);
    expect(entries[0].url).toBe(expected);
    for (const entry of entries) {
      expect(entry.url.startsWith(expected)).toBe(true);
      expect(entry.url).not.toMatch(/\/\/[^/]*\/\//);
    }
  });

  it('checkout and portal return URLs use SITE_URL, never localhost', async () => {
    setAppUrl(undefined);
    const created: Record<string, unknown>[] = [];
    const stripe = {
      customers: { create: async () => ({ id: 'cus_test' }) },
      checkout: {
        sessions: {
          create: async (params: Record<string, unknown>) => {
            created.push(params);
            return { url: 'https://checkout.example.test/session' };
          },
        },
      },
      billingPortal: {
        sessions: {
          create: async (params: Record<string, unknown>) => {
            created.push(params);
            return { url: 'https://portal.example.test/session' };
          },
        },
      },
    };
    vi.doMock('@/lib/stripe/server', () => ({
      getStripe: () => stripe,
      getPremiumPriceId: () => 'price_test',
      isStripeConfigured: () => true,
      isPremiumPriceConfigured: () => true,
    }));
    const { SubscriptionService } = await import('@/lib/services/subscription.service');
    const { SITE_URL } = await import('@/lib/site');
    const service = new SubscriptionService(
      { findByUser: async () => ({ status: 'inactive', stripe_customer_id: 'cus_test' }) } as never,
      {} as never,
    );
    await service.createCheckout('user-1', 'reader@example.test');
    await service.createPortal('user-1');
    expect(created).toHaveLength(2);
    const urls = [created[0].success_url, created[0].cancel_url, created[1].return_url] as string[];
    for (const url of urls) {
      expect(url.startsWith(`${SITE_URL}/premium`)).toBe(true);
      expect(url).not.toMatch(/localhost/);
    }
  });
});
