import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Production has no NEXT_PUBLIC_APP_URL, so GA must still resolve the canonical host (K20).
async function loadSite(appUrl: string | undefined) {
  vi.resetModules();
  if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = appUrl;
  return import('@/lib/site');
}

const ORIGINAL = process.env.NEXT_PUBLIC_APP_URL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = ORIGINAL;
});

describe('GA canonical-host gate (K20)', () => {
  it('loads GA on gofirepath.com in production when NEXT_PUBLIC_APP_URL is unset', async () => {
    const site = await loadSite(undefined);
    expect(site.SITE_URL).toBe('https://gofirepath.com');
    expect(site.isCanonicalProductionHost('gofirepath.com', 'production')).toBe(true);
    expect(site.isCanonicalProductionHost('www.gofirepath.com', 'production')).toBe(true);
  });

  it('treats an empty NEXT_PUBLIC_APP_URL like unset (K15)', async () => {
    const site = await loadSite('');
    expect(site.isCanonicalProductionHost('gofirepath.com', 'production')).toBe(true);
  });

  it('does not load GA on previews, localhost or other hosts', async () => {
    const site = await loadSite(undefined);
    expect(site.isCanonicalProductionHost('gofirepath.com', 'preview')).toBe(false);
    expect(site.isCanonicalProductionHost('gofirepath.com', undefined)).toBe(false);
    expect(site.isCanonicalProductionHost('firepath-abc.vercel.app', 'production')).toBe(false);
    expect(site.isCanonicalProductionHost('localhost', 'production')).toBe(false);
  });

  it('honours an explicit NEXT_PUBLIC_APP_URL override and strips a trailing slash', async () => {
    const site = await loadSite('https://staging.example.com/');
    expect(site.SITE_URL).toBe('https://staging.example.com');
    expect(site.isCanonicalProductionHost('staging.example.com', 'production')).toBe(true);
  });

  it('the consent banner gates GA through the shared site module, not its own env read', () => {
    const src = readFileSync(
      resolve(__dirname, '../../src/components/common/cookie-consent-banner.tsx'),
      'utf8',
    );
    expect(src).toMatch(/isCanonicalProductionHost\(\s*window\.location\.hostname,\s*process\.env\.NEXT_PUBLIC_VERCEL_ENV/);
    expect(src).not.toMatch(/process\.env\.NEXT_PUBLIC_APP_URL/);
  });
});
