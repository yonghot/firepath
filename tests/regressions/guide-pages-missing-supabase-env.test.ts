/**
 * Regression: public /guide pages 500'd when Supabase env was missing (2026-06-27),
 * and the hub then advertised an empty "coming soon" state plus dead guide links (2026-10).
 *
 * The page functions must render without a backend: createClient() throws when
 * NEXT_PUBLIC_SUPABASE_URL/ANON_KEY are absent, so the pages guard on
 * isSupabaseConfigured() before touching it. The hub must then list the guides
 * that really exist, with links that resolve and structured data that agrees.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { isHTTPAccessFallbackError } from 'next/dist/client/components/http-access-fallback/http-access-fallback';
import GuidesIndexPage, { metadata } from '@/app/(main)/guide/page';
import GuidePage, { generateMetadata } from '@/app/(main)/guide/[slug]/page';
import { GuideCardLink } from '@/app/(main)/guide/guide-card-link';
import { getIndexablePages } from '@/lib/content-pages';
import { SITE_URL } from '@/lib/site';
import { hasStaticRoute } from './helpers/app-routes';

const trackEvent = vi.hoisted(() => vi.fn());
vi.mock('@/lib/analytics', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/analytics')>()),
  trackEvent,
}));

function cardHrefs(html: string): string[] {
  return [...html.matchAll(/<a [^>]*>/g)]
    .map((m) => m[0])
    .filter((tag) => /class="group block/.test(tag))
    .map((tag) => /href="([^"]+)"/.exec(tag)?.[1] ?? '');
}

function itemList(html: string): { itemListElement: { url: string }[]; '@type': string } {
  const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  const parsed = blocks.map((m) => JSON.parse(m[1]));
  const found = parsed.find((node) => node['@type'] === 'ItemList');
  if (!found) throw new Error('no ItemList JSON-LD on /guide');
  return found;
}

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY';

describe('public /guide pages — graceful degradation when Supabase env missing', () => {
  let savedUrl: string | undefined;
  let savedKey: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedKey = process.env[ANON_KEY];
    delete process.env[URL_KEY];
    delete process.env[ANON_KEY];
  });

  afterEach(() => {
    if (savedUrl === undefined) delete process.env[URL_KEY];
    else process.env[URL_KEY] = savedUrl;
    if (savedKey === undefined) delete process.env[ANON_KEY];
    else process.env[ANON_KEY] = savedKey;
  });

  it('guide index page renders (does not throw) with no Supabase configured', async () => {
    // Before the fix this rejected with "Your project's URL and Key are required…".
    await expect(GuidesIndexPage()).resolves.toBeTruthy();
  });

  it('guide index generateMetadata is resilient (returns metadata object)', async () => {
    // metadata is a static export object here; just assert the module loads and
    // the page component is callable without a configured backend.
    expect(typeof GuidesIndexPage).toBe('function');
    expect(metadata).toHaveProperty('title');
  });

  it('guide [slug] generateMetadata returns not-found metadata (no throw) when unconfigured', async () => {
    const meta = await generateMetadata({ params: Promise.resolve({ slug: 'x' }) });
    // Before the fix this threw "Page changed from static to dynamic … cookies".
    expect(meta).toEqual({ title: 'Guide Not Found' });
  });

  it('guide [slug] page calls notFound() (not a Supabase/static-dynamic error) when unconfigured', async () => {
    // notFound() throws a Next navigation signal — that is the CORRECT behavior
    // (-> 404), as opposed to the createServerClient throw or the cookies bailout.
    const failure = await GuidePage({ params: Promise.resolve({ slug: 'x' }) }).catch((e: unknown) => e);
    expect(isHTTPAccessFallbackError(failure)).toBe(true);
    expect((failure as { digest: string }).digest).toBe('NEXT_HTTP_ERROR_FALLBACK;404');
  });

  it('lists published guides without a database instead of advertising unfinished content', async () => {
    const html = renderToStaticMarkup(await GuidesIndexPage());
    for (const path of ['/fire-guide', '/fire-types', '/healthcare-bridge', '/methodology', '/fire-statistics']) {
      expect(html).toContain(`href="${path}"`);
    }
    expect(html).not.toMatch(/coming soon/i);
    expect(html).not.toContain('/guide/what-is-');
  });

  it('every internal link on the hub resolves to an existing route', async () => {
    const html = renderToStaticMarkup(await GuidesIndexPage());
    const internal = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(internal.length).toBeGreaterThan(5);
    const dead = internal.filter((href) => !hasStaticRoute(href));
    expect(dead).toEqual([]);
  });

  it('card links are limited to pages the content registry marks indexable', async () => {
    const html = renderToStaticMarkup(await GuidesIndexPage());
    const hrefs = cardHrefs(html);
    expect(hrefs).toHaveLength(5);
    const indexable = new Set(getIndexablePages().map((p) => p.canonicalPath));
    expect(hrefs.filter((href) => !indexable.has(href))).toEqual([]);
  });

  it('answer table cells hold readable values, never raw route text', async () => {
    const html = renderToStaticMarkup(await GuidesIndexPage());
    const table = html.match(/<table[\s\S]*?<\/table>/)?.[0] ?? '';
    expect(table).not.toMatch(/<td[^>]*>\s*\//);
    expect(table).not.toContain('Type Reference');
  });

  it('answer table lists all five FIRE types', async () => {
    const html = renderToStaticMarkup(await GuidesIndexPage());
    const table = html.match(/<table[\s\S]*?<\/table>/)?.[0] ?? '';
    const rowLabels = [...table.matchAll(/<th scope="row"[^>]*>([^<]*)<\/th>/g)].map((m) => m[1]);
    expect(rowLabels).toHaveLength(5);
    for (const type of ['Lean FIRE', 'Regular FIRE', 'Fat FIRE', 'Coast FIRE', 'Barista FIRE']) {
      expect(rowLabels.some((label) => label.startsWith(type))).toBe(true);
    }
    expect(rowLabels.find((label) => label.startsWith('Coast FIRE'))).toContain('seed needed today');
  });

  it('copy promises only what the destination pages hold', async () => {
    const html = renderToStaticMarkup(await GuidesIndexPage());
    expect(html).not.toMatch(/engine-computed/i);
    expect(html).not.toMatch(/and limitations/i);
    expect(html).not.toMatch(/comprehensive guides/i);
    expect(html).not.toMatch(/everything you need to know/i);
    expect(String(metadata.description)).not.toMatch(/comprehensive/i);
  });

  it('ItemList JSON-LD has the published guides with absolute canonical URLs', async () => {
    const list = itemList(renderToStaticMarkup(await GuidesIndexPage()));
    expect(list['@type']).toBe('ItemList');
    expect(list.itemListElement.length).toBeGreaterThanOrEqual(5);
    for (const item of list.itemListElement) {
      expect(item.url.startsWith(`${SITE_URL}/`)).toBe(true);
      expect(hasStaticRoute(item.url.slice(SITE_URL.length))).toBe(true);
    }
  });

  it('ItemList URLs follow the configured site URL instead of a hardcoded host', async () => {
    vi.resetModules();
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://staging.example.test');
    try {
      const page = await import('@/app/(main)/guide/page');
      const list = itemList(renderToStaticMarkup(await page.default()));
      expect(list.itemListElement.length).toBeGreaterThanOrEqual(5);
      for (const item of list.itemListElement) {
        expect(item.url.startsWith('https://staging.example.test/')).toBe(true);
      }
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });

  it('every hub card is wired to the click-tracking link', async () => {
    const found: string[] = [];
    const visit = (node: unknown): void => {
      if (Array.isArray(node)) return node.forEach(visit);
      if (!isValidElement(node)) return;
      if (node.type === GuideCardLink) found.push((node.props as { href: string }).href);
      visit((node.props as { children?: unknown }).children);
    };
    visit(await GuidesIndexPage());
    expect(found).toEqual(['/fire-guide', '/fire-types', '/healthcare-bridge', '/methodology', '/fire-statistics']);
  });

  it('hub card click reports related_click with the hub module and the target path', () => {
    trackEvent.mockClear();
    const element = GuideCardLink({ href: '/fire-types', className: 'x', children: 'label' });
    (element.props as { onClick: () => void }).onClick();
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(trackEvent).toHaveBeenCalledWith('related_click', { link_module: 'hub', link_url: '/fire-types' });
    expect((element.props as { href: string }).href).toBe('/fire-types');
  });
});
