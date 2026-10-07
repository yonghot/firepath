import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
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

  it('the set of routes whose layout chain mounts <AdLoader /> equals the content-route allow-list', () => {
    const withLoader = ENTRIES.filter(hasLoader).map((entry) => entry.route).sort();
    expect(withLoader).toEqual([...LOADER_ROUTES].sort());
  });

  for (const route of NO_LOADER_ROUTES) {
    it(`${route} has no loader in its layout chain`, () => {
      const entries = ENTRIES.filter((entry) => entry.route === route);
      expect(entries.length).toBeGreaterThan(0);
      for (const entry of entries) expect(hasLoader(entry)).toBe(false);
    });
  }

  it('the root layout carries no loader, preconnect or dns-prefetch, but keeps the publisher meta tag', () => {
    const root = read(join(APP, 'layout.tsx'));
    expect(root).not.toMatch(/adsbygoogle\.js/);
    expect(root).not.toMatch(/adsense-loader/);
    expect(root).not.toMatch(/pagead2\.googlesyndication\.com/);
    expect(root).not.toMatch(/googleads\.g\.doubleclick\.net/);
    expect(root).not.toMatch(/<AdLoader\b/);
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
  async function loaderMarkup(): Promise<string> {
    const { AdLoader } = await import('@/components/ads/ad-loader');
    return renderToStaticMarkup(createElement(AdLoader));
  }

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
