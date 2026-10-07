import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { getPathMatch } from 'next/dist/shared/lib/router/utils/path-match';
import { prepareDestination } from 'next/dist/shared/lib/router/utils/prepare-destination';
import nextConfig from '../../next.config';
import NotFound from '@/app/not-found';

vi.mock('next/font/google', () => ({ Inter: () => ({ variable: 'font-inter', className: 'font-inter' }) }));

const SRC_APP = path.resolve(__dirname, '../../src/app');
const KEY_ROUTE = '@/app/api/indexnow-key/[key]/route';

type Rewrite = { source: string; destination: string };

async function rewrites(): Promise<Rewrite[]> {
  const raw = await nextConfig.rewrites?.();
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Rewrite[];
  return [...(raw.beforeFiles ?? []), ...(raw.afterFiles ?? []), ...(raw.fallback ?? [])] as Rewrite[];
}

async function keyRewrite(): Promise<Rewrite> {
  const found = (await rewrites()).find((rule) => rule.destination.startsWith('/api/indexnow-key/'));
  expect(found, 'a rewrite to /api/indexnow-key/:key').toBeDefined();
  return found as Rewrite;
}

function matches(rule: Rewrite, pathname: string): false | Record<string, string> {
  return getPathMatch(rule.source)(pathname) as false | Record<string, string>;
}

afterEach(() => vi.unstubAllEnvs());

describe('FIRE-32: one 404 behaviour for single-segment misses', () => {
  it('no catch-all single-segment dynamic route remains at the app root', () => {
    const roots = readdirSync(SRC_APP, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    expect(roots.filter((name) => name.startsWith('[') && !name.startsWith('[...'))).toEqual([]);
  });

  it('the IndexNow key file is rewritten from /<key>.txt for key-shaped names only', async () => {
    const rule = await keyRewrite();
    for (const key of ['abc123DEF456', 'a-b_c-d_e-f_1234', 'k'.repeat(8), 'k'.repeat(64), 'k'.repeat(128)]) {
      const params = matches(rule, `/${key}.txt`);
      expect(params, key).not.toBe(false);
      const { newUrl } = prepareDestination({ appendParamsToQuery: false, destination: rule.destination, params: params as Record<string, string>, query: {} });
      expect(newUrl).toBe(`/api/indexnow-key/${key}`);
    }
    for (const miss of ['/contact-x', '/llms-x', '/about', '/about.txt', '/llms.txt', '/robots.txt', '/ads.txt', '/short.txt', `/${'k'.repeat(129)}.txt`, '/a/abc123DEF456.txt', '/abc123DEF456', '/abc123DEF456.txt/x', '/data.json']) {
      expect(matches(rule, miss), miss).toBe(false);
    }
  });

  it('the key route serves the exact key as text/plain and 404s otherwise', async () => {
    expect(existsSync(path.join(SRC_APP, 'api/indexnow-key/[key]/route.ts'))).toBe(true);
    const { GET } = await import(/* @vite-ignore */ KEY_ROUTE);
    const call = (key: string) => GET(new Request(`http://localhost/api/indexnow-key/${key}`), { params: Promise.resolve({ key }) });

    vi.stubEnv('INDEXNOW_KEY', 'abc123def456');
    const ok = await call('abc123def456');
    expect(ok.status).toBe(200);
    expect(ok.headers.get('content-type')).toMatch(/^text\/plain/);
    expect(await ok.text()).toBe('abc123def456');
    for (const miss of ['wrongkey1234', 'abc123def456.txt', 'ABC123DEF456', '']) {
      expect((await call(miss)).status, miss).toBe(404);
    }

    vi.stubEnv('INDEXNOW_KEY', '');
    expect((await call('abc123def456')).status).toBe(404);
  });

  it('the not-found page links home and carries no ad loader or script', () => {
    const html = renderToStaticMarkup(createElement(NotFound));
    expect(html).toMatch(/href="\/"/);
    expect(html).toContain('404');
    expect(html).not.toMatch(/adsbygoogle|<script/);
  });

  it('root metadata no longer declares index/follow, so a 404 has no conflicting robots metas', async () => {
    const { metadata } = await import('@/app/layout');
    expect(metadata.robots).toEqual({ 'max-image-preview': 'large' });
  });
});
