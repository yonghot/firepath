import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
let mockPath: string | null = '/about';
vi.mock('next/navigation', () => ({ usePathname: () => mockPath }));
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { staticRoutes } from './helpers/app-routes';

const ROOT = join(__dirname, '..', '..');
const APP = join(ROOT, 'src', 'app');
const SHARED_ID = 'ca-pub-1378312299412437';

const LOADER_ROUTES = [
  '/',
  '/about',
  '/fire-guide',
  '/fire-statistics',
  '/fire-types',
  '/guide',
  '/guide/[slug]',
  '/healthcare-bridge',
  '/methodology',
  '/privacy',
  '/terms',
];
const NO_LOADER_ROUTES = [
  '/embed',
  '/embed-this',
  '/login',
  '/signup',
  '/premium',
  '/contact',
  '/saved',
  '/result',
  'not-found',
  'error',
];

function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}

const read = (file: string) => stripComments(readFileSync(file, 'utf8'));

type Entry = { route: string; layouts: string[] };

function collect(dir: string, segments: string[], layouts: string[], out: Entry[]): void {
  const layout = join(dir, 'layout.tsx');
  const chain = existsSync(layout) ? [...layouts, layout] : layouts;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const url = '/' + segments.join('/');
      if (entry.name === 'page.tsx') out.push({ route: url, layouts: chain });
      if (segments.length === 0 && (entry.name === 'not-found.tsx' || entry.name === 'error.tsx')) {
        out.push({ route: entry.name.replace('.tsx', ''), layouts: chain });
      }
      continue;
    }
    if (!entry.isDirectory() || entry.name === '__tests__' || entry.name === 'api') continue;
    const isGroup = /^\(.+\)$/.test(entry.name);
    collect(join(dir, entry.name), isGroup ? segments : [...segments, entry.name], chain, out);
  }
}

const ENTRIES: Entry[] = [];
collect(APP, [], [], ENTRIES);
const LOADER_MARKUP = /<AdLoader\b|adsbygoogle\.js|adsense-loader/;
const hasLoader = (entry: Entry) => entry.layouts.some((file) => LOADER_MARKUP.test(read(file)));

function stubAds(client: string | undefined, vercelEnv: string | undefined) {
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', client);
  vi.stubEnv('VERCEL_ENV', vercelEnv);
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
}

afterEach(() => vi.unstubAllEnvs());

describe('K7: the ad loader is mounted only on content routes', () => {
  it('discovers the routes it audits', () => {
    for (const route of [...LOADER_ROUTES, ...NO_LOADER_ROUTES]) {
      expect(
        ENTRIES.some((entry) => entry.route === route),
        `${route} must exist in src/app`,
      ).toBe(true);
    }
  });

  it('the eligibility allow-list equals the content-route list, with every guide page and no unknown guide slug', async () => {
    const { AD_STATIC_PATHS, buildAdEligibilityRules, isAdEligiblePath } = await import('@/lib/ad-eligibility');
    const { GUIDE_PAGES } = await import('@/lib/content-pages');
    const rules = buildAdEligibilityRules();
    expect([...AD_STATIC_PATHS].sort()).toEqual(LOADER_ROUTES.filter((r) => !r.includes('[')).sort());
    for (const page of GUIDE_PAGES) expect(isAdEligiblePath(page.canonicalPath, rules), page.canonicalPath).toBe(true);
    for (const path of ['/guide/zzz-unknown', '/embed', '/embed-this', '/login', '/signup', '/premium', '/contact', '/saved', '/result', '/_not-found', '/about/x'])
      expect(isAdEligiblePath(path, rules), path).toBe(false);
    expect(isAdEligiblePath('/about/', rules)).toBe(true);
  });

  it('no layout below the root mounts the loader, so presence is decided by pathname eligibility alone', () => {
    for (const entry of ENTRIES) for (const file of entry.layouts.filter((l) => l !== join(APP, 'layout.tsx'))) expect(LOADER_MARKUP.test(read(file)), file).toBe(false);
  });

  it('the root layout mounts the loader inside <head> right after ConsentDefault, with no hardcoded ad markup, and keeps the publisher meta tag', () => {
    const root = read(join(APP, 'layout.tsx'));
    expect(root).toMatch(/<head>\s*<ConsentDefault\s*\/>\s*\{_adsenseId && <AdLoader\b[\s\S]*?<\/head>/);
    expect(root).not.toMatch(/adsbygoogle\.js|adsense-loader|pagead2\.googlesyndication\.com|googleads\.g\.doubleclick\.net/);
    expect(root).toMatch(/google-adsense-account/);
  });

  it('the shared chrome never mounts the loader, so only a layout can decide presence', () => {
    expect(read(join(ROOT, 'src', 'components', 'layouts', 'site-chrome.tsx'))).not.toMatch(/AdLoader/);
  });

  it('the feedback launcher lives in the shared chrome footer, not the root layout (no widget on /embed or 404)', () => {
    expect(read(join(APP, 'layout.tsx'))).not.toMatch(/FeedbackWidget/);
    expect(read(join(ROOT, 'src', 'components', 'layouts', 'footer.tsx'))).toMatch(/<FeedbackWidget\b/);
    expect(read(join(ROOT, 'src', 'components', 'layouts', 'site-chrome.tsx'))).toMatch(/<Footer\b/);
    for (const layout of ['(main)', '(utility)']) {
      expect(read(join(APP, layout, 'layout.tsx')), layout).toMatch(/<SiteChrome\b/);
    }
  });

  it('premium, saved, contact, embed-this and result (noindex, example-only for crawlers) moved to (utility) and their URLs are unchanged', () => {
    for (const dir of ['premium', 'saved', 'contact', 'embed-this', 'result']) {
      expect(existsSync(join(APP, '(utility)', dir, 'page.tsx')), `(utility)/${dir}`).toBe(true);
      expect(existsSync(join(APP, '(main)', dir)), `(main)/${dir} must be gone`).toBe(false);
      expect(staticRoutes().has(`/${dir}`), `/${dir}`).toBe(true);
    }
  });
});

describe('AdLoader output', () => {
  async function loaderMarkup(path: string | null = '/about'): Promise<string> {
    mockPath = path;
    const { AdLoader } = await import('@/components/ads/ad-loader');
    const { buildAdEligibilityRules } = await import('@/lib/ad-eligibility');
    const { resolveAdsenseClientId } = await import('@/lib/ads-env');
    const clientId = resolveAdsenseClientId();
    return clientId ? renderToStaticMarkup(createElement(AdLoader, { clientId, rules: buildAdEligibilityRules() })) : '';
  }

  it('renders nothing on an ineligible or unknown pathname', async () => {
    stubAds('ca-pub-1234567890', 'preview');
    for (const path of ['/login', '/contact', '/guide/zzz', null]) expect(await loaderMarkup(path), String(path)).toBe('');
  });

  it('emits exactly one async adsense-loader script, a preconnect and a dns-prefetch for a configured id', async () => {
    stubAds('ca-pub-1234567890', 'preview');
    const html = await loaderMarkup();
    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).toMatch(/id="adsense-loader"/);
    expect(html).toMatch(/\basync\b/);
    expect(html).toContain('https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890');
    expect(html).toMatch(/rel="preconnect"[^>]*href="https:\/\/pagead2\.googlesyndication\.com"|href="https:\/\/pagead2\.googlesyndication\.com"[^>]*rel="preconnect"/);
    expect(html).toContain('https://googleads.g.doubleclick.net');
  });

  for (const empty of ['', ' ', undefined]) {
    it(`renders nothing outside production when the env is ${JSON.stringify(empty)}`, async () => {
      stubAds(empty, 'preview');
      const html = await loaderMarkup();
      expect(html).not.toMatch(/<script\b/);
      expect(html).not.toContain('adsbygoogle');
    });
  }

  it('an empty-string env in production still renders the loader with the shared publisher id (K15)', async () => {
    stubAds('', 'production');
    const html = await loaderMarkup();
    expect(html).toContain(`adsbygoogle.js?client=${SHARED_ID}`);
  });
});
