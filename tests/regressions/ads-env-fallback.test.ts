import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import { join, relative } from 'node:path';
import { preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: '--font-sans' }) }));

await preloadPages(['/privacy']);
await Promise.all([
  import('@/app/layout'),
  import('@/app/ads.txt/route'),
  import('@/components/common/ad-slot'),
  import('@/lib/monetization'),
]);

const ROOT = join(__dirname, '..', '..');
const SHARED_ID = 'ca-pub-1378312299412437';
const ADS_TXT_AUTH = 'f08c47fec0942fa0';

const VALUES: { label: string; value: string | undefined; configured: string | undefined }[] = [
  { label: "''", value: '', configured: undefined },
  { label: "' '", value: ' ', configured: undefined },
  { label: "'pub-123'", value: 'pub-123', configured: 'ca-pub-123' },
  { label: "'ca-pub-123'", value: 'ca-pub-123', configured: 'ca-pub-123' },
  { label: "' ca-pub-123 '", value: ' ca-pub-123 ', configured: 'ca-pub-123' },
  { label: 'undefined', value: undefined, configured: undefined },
];
const ENVIRONMENTS: { label: string; vercelEnv: string | undefined; fallback: boolean }[] = [
  { label: 'production', vercelEnv: 'production', fallback: true },
  { label: 'preview', vercelEnv: 'preview', fallback: false },
  { label: 'unset', vercelEnv: undefined, fallback: false },
];

function stub(value: string | undefined, vercelEnv: string | undefined) {
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', value);
  vi.stubEnv('VERCEL_ENV', vercelEnv);
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
}

function expectedId(configured: string | undefined, fallback: boolean): string | undefined {
  return configured ?? (fallback ? SHARED_ID : undefined);
}

function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.|\.d\.ts$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllEnvs());

describe('K15: one AdSense client id, one || semantics, on every surface', () => {
  for (const env of ENVIRONMENTS) {
    for (const v of VALUES) {
      it(`${env.label} + env ${v.label}: loader id, meta, ads.txt, ad unit, monetization config and privacy agree`, async () => {
        stub(v.value, env.vercelEnv);
        const expected = expectedId(v.configured, env.fallback);

        const { resolveAdsenseClientId, adsEnabled } = await import('@/lib/ads-env');
        expect(resolveAdsenseClientId()).toBe(expected);
        expect(adsEnabled()).toBe(expected !== undefined);

        const layout = await import('@/app/layout');
        const other = (layout.metadata.other ?? {}) as Record<string, string>;
        expect(other['google-adsense-account']).toBe(expected);

        const { GET } = await import('@/app/ads.txt/route');
        const adsTxt = await (GET() as Response).text();
        expect(adsTxt).toBe(expected ? `google.com, ${expected.replace(/^ca-/, '')}, DIRECT, ${ADS_TXT_AUTH}\n` : '');

        const { AdSlot } = await import('@/components/common/ad-slot');
        const unit = renderToStaticMarkup(createElement(AdSlot, { slot: '1234567890' }));
        if (expected) expect(unit).toContain(`data-ad-client="${expected}"`);
        else expect(unit).toBe('');

        const { buildMonetizationConfig } = await import('@/lib/monetization');
        expect(buildMonetizationConfig().adsenseClientId).toBe(expected ?? null);

        const privacy = await renderPage('/privacy');
        const claimsAds = /Third-party vendors, including Google, use cookies to serve ads/.test(privacy);
        expect(claimsAds).toBe(expected !== undefined);
      });
    }
  }

  it('production with an empty-string env keeps the loader id and the publisher meta (K15)', async () => {
    stub('', 'production');
    const { resolveAdsenseClientId } = await import('@/lib/ads-env');
    expect(resolveAdsenseClientId()).toBe(SHARED_ID);
    const layout = await import('@/app/layout');
    expect((layout.metadata.other as Record<string, string>)['google-adsense-account']).toBe(SHARED_ID);
  });

  it('a preview deployment with no configured id never gets ad code', async () => {
    stub(undefined, 'preview');
    const { resolveAdsenseClientId } = await import('@/lib/ads-env');
    expect(resolveAdsenseClientId()).toBeUndefined();
  });

  it('the client bundle sees production through NEXT_PUBLIC_VERCEL_ENV when VERCEL_ENV is absent', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', '');
    vi.stubEnv('VERCEL_ENV', undefined);
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    const { resolveAdsenseClientId } = await import('@/lib/ads-env');
    expect(resolveAdsenseClientId()).toBe(SHARED_ID);
  });

  it('the shared fallback id equals the publisher line served in the live ads.txt', async () => {
    stub('', 'production');
    const { GET } = await import('@/app/ads.txt/route');
    expect(await (GET() as Response).text()).toBe(`google.com, pub-1378312299412437, DIRECT, ${ADS_TXT_AUTH}\n`);
  });

  it("next.config mirrors VERCEL_ENV with || so an empty string falls through to NEXT_PUBLIC_VERCEL_ENV", async () => {
    vi.stubEnv('VERCEL_ENV', '');
    vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
    const config = (await import('../../next.config')).default;
    expect(config.env?.NEXT_PUBLIC_VERCEL_ENV).toBe('production');
  });

  it('only src/lib/ads-env.ts reads NEXT_PUBLIC_ADSENSE_CLIENT_ID', () => {
    const readers = sourceFiles(join(ROOT, 'src'))
      .filter((file) => /NEXT_PUBLIC_ADSENSE_CLIENT_ID/.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(ROOT, file).replace(/\\/g, '/'));
    expect(readers).toEqual(['src/lib/ads-env.ts']);
  });

  it('no AdSense id read uses ?? (an empty string must fall through)', () => {
    const offenders = sourceFiles(join(ROOT, 'src'))
      .filter((file) => /ADSENSE_CLIENT_ID[^;\n]*\?\?/.test(stripComments(readFileSync(file, 'utf8'))))
      .map((file) => relative(ROOT, file).replace(/\\/g, '/'));
    expect(offenders).toEqual([]);
  });

  it('the cookie banner and the privacy page derive ad state from adsEnabled()', () => {
    for (const file of ['src/components/common/cookie-consent-banner.tsx', 'src/app/(main)/privacy/page.tsx']) {
      const source = stripComments(readFileSync(join(ROOT, file), 'utf8'));
      expect(source, file).toMatch(/adsEnabled\(\)/);
      expect(source, file).toMatch(/from '@\/lib\/ads-env'/);
    }
  });
});
