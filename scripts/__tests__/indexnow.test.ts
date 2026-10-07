// @vitest-environment node
// The postbuild path of scripts/indexnow.mjs, spawned as a real process. K19-D delta logic is pinned in tests/regressions/indexnow-delta.test.ts.
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { spawn } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts', 'indexnow.mjs');
const KEY = 'unit-test-key-0000';
const BLOCKED = 'BLOCKED_EXTERNAL_FETCH';
const CLOSED = 'http://127.0.0.1:9';
const HOST = 'https://gofirepath.com';
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';

const sitemap = (entries: Array<[string, string?]>) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>\n${entries
    .map(([p, lastmod]) => `<url>\n<loc>${HOST}${p}</loc>\n${lastmod ? `<lastmod>${lastmod}</lastmod>\n` : ''}<changefreq>monthly</changefreq>\n</url>`)
    .join('\n')}\n</urlset>`;
const page = (p: string) => `${HOST}${p}`;

type Route = { status: number; body: string };
type Recorded = { method: string; url: string; body: string; contentType: string | undefined };

let tmp: string;
let server: Server;
let origin: string;
let routes: Record<string, Route> = {};
let postStatus = 200;
let requests: Recorded[] = [];

const readBody = (req: IncomingMessage) =>
  new Promise<string>((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });

beforeAll(async () => {
  tmp = mkdtempSync(path.join(tmpdir(), 'indexnow-test-'));
  writeFileSync(
    path.join(tmp, 'guard.mjs'),
    `const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const host = new URL(typeof input === 'string' ? input : (input && input.url) || String(input)).hostname;
  if (host !== '127.0.0.1') {
    console.error('${BLOCKED} ' + host);
    return Promise.reject(new Error('external fetch blocked in tests'));
  }
  return realFetch(input, init);
};
`,
  );
  server = createServer(async (req, res) => {
    const body = await readBody(req);
    requests.push({ method: req.method ?? '', url: req.url ?? '', body, contentType: req.headers['content-type'] });
    const route = req.method === 'POST' ? { status: postStatus, body: '' } : (routes[req.url ?? ''] ?? { status: 404, body: 'not found' });
    res.writeHead(route.status, { 'content-type': 'text/plain' });
    res.end(route.body);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(tmp, { recursive: true, force: true });
});

function serve(live: Array<[string, string?]> | Route | null, post = 200, key: Route = { status: 200, body: KEY }) {
  requests = [];
  postStatus = post;
  routes = { [`/${KEY}.txt`]: key };
  if (Array.isArray(live)) routes['/sitemap.xml'] = { status: 200, body: sitemap(live) };
  else if (live) routes['/sitemap.xml'] = live;
}

async function run(options: { next: string; served?: boolean; env?: Record<string, string> }) {
  const cwd = mkdtempSync(path.join(tmp, 'build-'));
  const app = path.join(cwd, '.next', 'server', 'app');
  mkdirSync(app, { recursive: true });
  writeFileSync(path.join(app, 'sitemap.xml.body'), options.next);
  // Explicit env: nothing from the developer's shell (INDEXNOW_*, VERCEL_ENV) reaches the child, and the production origin defaults to a closed local port.
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    VERCEL_ENV: 'production',
    INDEXNOW_KEY: KEY,
    INDEXNOW_PROD_ORIGIN: options.served ? origin : CLOSED,
    INDEXNOW_ENDPOINT: `${origin}/indexnow`,
    ...options.env,
  };
  return new Promise<{ code: number | null; out: string; err: string }>((resolve) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(path.join(tmp, 'guard.mjs')).href, SCRIPT], { cwd, env });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

const posts = () => requests.filter((r) => r.method === 'POST');
const sent = () => (JSON.parse(posts()[0]?.body ?? '{}') as { host: string; key: string; keyLocation: string; urlList: string[] }).urlList?.slice().sort();

describe('indexnow.mjs submits only what changed against the live sitemap', () => {
  it('posts added, re-dated and removed URLs with the site host and key location, and nothing else', async () => {
    serve([['/', '2026-10-01'], ['/guide', '2026-10-01'], ['/fire-types', '2026-10-01'], ['/old-page', '2026-10-01']]);
    const result = await run({
      served: true,
      next: sitemap([['/', '2026-10-01'], ['/guide', '2026-10-07'], ['/fire-types', '2026-10-01'], ['/llms-new', '2026-10-07']]),
    });
    expect(result.code).toBe(0);
    expect(result.err).not.toContain(BLOCKED);
    expect(posts()).toHaveLength(1);
    const payload = JSON.parse(posts()[0].body);
    expect(sent()).toEqual([page('/guide'), page('/llms-new'), page('/old-page')]);
    expect(payload.host).toBe('gofirepath.com');
    expect(payload.key).toBe(KEY);
    expect(payload.keyLocation).toBe(`${HOST}/${KEY}.txt`);
    expect(posts()[0].contentType).toMatch(/application\/json/);
    expect(requests.filter((r) => r.method === 'GET').map((r) => r.url)).toEqual(['/sitemap.xml', `/${KEY}.txt`]);
    expect(result.out).toMatch(/1 added, 1 removed \(0 now noindex\), 1 lastmod changed, 0 other-host dropped; 4 in new sitemap/);
    expect(result.out).toMatch(/HTTP 200 for 3 urls/);
  });

  it('logs the HTTP status and URL count, never the key, and sends no localhost URL', async () => {
    serve([['/', '2026-10-01']], 202);
    const result = await run({ served: true, next: sitemap([['/', '2026-10-07']]) });
    expect(result.out).toMatch(/HTTP 202 for 1 urls/);
    expect(result.out).not.toContain(KEY);
    expect(result.err).not.toContain(KEY);
    for (const url of sent()) expect(url.startsWith(`${HOST}/`)).toBe(true);
    expect(posts()[0].body).not.toMatch(/localhost|127\.0\.0\.1/);
  });

  it('submits nothing when no URL is added, re-dated or removed', async () => {
    const same: Array<[string, string]> = [['/', '2026-10-07'], ['/guide', '2026-10-07']];
    serve(same);
    const result = await run({ served: true, next: sitemap(same) });
    expect(result.code).toBe(0);
    expect(posts()).toHaveLength(0);
    expect(result.out).toMatch(/no changed urls, nothing submitted/);
  });

  it('never submits URLs from another host', async () => {
    serve({ status: 200, body: `<urlset ${NS}><url><loc>${page('/')}</loc></url><url><loc>https://other.example/old</loc></url></urlset>` });
    const next = `<urlset ${NS}><url><loc>${page('/')}</loc></url><url><loc>${page('/guide')}</loc></url><url><loc>https://other.example/new</loc></url></urlset>`;
    const result = await run({ served: true, next });
    expect(sent()).toEqual([page('/guide')]);
    expect(result.out).toMatch(/2 other-host dropped/);
  });

  it('exits 0, lists the unsent URLs and never touches another host when the IndexNow endpoint is unreachable', async () => {
    serve([['/', '2026-10-01']]);
    const result = await run({ served: true, next: sitemap([['/', '2026-10-07']]), env: { INDEXNOW_ENDPOINT: `${CLOSED}/indexnow` } });
    expect(result.code).toBe(0);
    expect(result.out).toMatch(/chunk submission failed/);
    expect(result.out).toMatch(/WARNING 1 changed urls not submitted \(request failed\)/);
    expect(result.err).not.toContain(BLOCKED);
  });

  it('keeps api.indexnow.org only as the default, and carries no localhost or production-origin literal', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    expect(source.match(/https:\/\/api\.indexnow\.org\/indexnow/g) ?? []).toHaveLength(1);
    expect(source).toMatch(/env\.INDEXNOW_ENDPOINT\s*\|\|\s*"https:\/\/api\.indexnow\.org\/indexnow"/);
    expect(source).not.toMatch(/localhost|127\.0\.0\.1|gofirepath\.com/);
  });
});

describe('indexnow.mjs fails closed: no comparison, no submission (the full-resubmit path is gone by design)', () => {
  const next = sitemap([['/', '2026-10-07'], ['/guide', '2026-10-07'], ['/fire-types', '2026-10-07']]);

  it('exits 0 and submits nothing when production is unreachable', async () => {
    serve(null);
    const result = await run({ next });
    expect(result.code).toBe(0);
    expect(requests).toHaveLength(0);
    expect(result.out).toMatch(/comparison failed, nothing submitted/);
    expect(result.out).not.toMatch(/HTTP \d+ for|submitted \d+ of/);
    expect(result.err).not.toContain(BLOCKED);
  });

  it('ignores INDEXNOW_FORCE_ALL, INDEXNOW_PREV_SITEMAP_URL and INDEXNOW_SITEMAP_OVERRIDE: a failed comparison submits nothing even when they are set', async () => {
    serve({ status: 503, body: 'down' });
    routes['/prev-sitemap.xml'] = { status: 200, body: sitemap([['/']]) };
    const override = path.join(tmp, 'override-sitemap.xml.body');
    writeFileSync(override, next);
    const result = await run({
      served: true,
      next: sitemap([['/']]),
      env: { INDEXNOW_FORCE_ALL: '1', INDEXNOW_PREV_SITEMAP_URL: `${origin}/prev-sitemap.xml`, INDEXNOW_SITEMAP_OVERRIDE: override },
    });
    expect(result.code).toBe(0);
    expect(posts()).toHaveLength(0);
    expect(requests.map((r) => r.url)).toEqual(['/sitemap.xml']);
    expect(result.out).toMatch(/comparison failed, nothing submitted \(production sitemap: .*HTTP 503\)/);
  });

  it('submits nothing when the live key file does not carry the key', async () => {
    serve([['/']], 200, { status: 200, body: 'something else' });
    const result = await run({ served: true, next: sitemap([['/'], ['/new']]) });
    expect(result.code).toBe(0);
    expect(posts()).toHaveLength(0);
    expect(result.out).toMatch(/skipped \(key file check failed: /);
  });
});

describe('indexnow.mjs skips builds that must not submit', () => {
  it.each([
    ['a local build', { VERCEL_ENV: '' }, /skipped \(not a production build\)/],
    ['a preview build', { VERCEL_ENV: 'preview' }, /skipped \(not a production build\)/],
    ['production without a key', { INDEXNOW_KEY: '' }, /skipped \(INDEXNOW_KEY unset\)/],
  ])('%s makes no request at all', async (_, env: Record<string, string>, expected: RegExp) => {
    serve([['/', '2026-10-01']]);
    const result = await run({ served: true, next: sitemap([['/', '2026-10-07']]), env });
    expect(result.code).toBe(0);
    expect(requests).toHaveLength(0);
    expect(result.out).toMatch(expected);
  });
});

describe('indexnow.mjs reads the built sitemap', () => {
  it('extracts every <loc> URL of the build', async () => {
    serve([['/legacy']]);
    const result = await run({ served: true, next: sitemap([['/'], ['/guide'], ['/fire-types']]) });
    expect(result.code).toBe(0);
    expect(sent()).toEqual([page('/'), page('/fire-types'), page('/guide'), page('/legacy')]);
  });

  it('submits nothing for a sitemap with zero <url> entries', async () => {
    serve([['/', '2026-10-01']]);
    const result = await run({ served: true, next: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>\n</urlset>` });
    expect(result.code).toBe(0);
    expect(requests).toHaveLength(0);
    expect(result.out).toMatch(/skipped \(new sitemap unreadable: sitemap has no <url> entries\)/);
  });

  it('does not choke on malformed or partial XML', async () => {
    serve([['/', '2026-10-01']]);
    const result = await run({ served: true, next: '<not xml at all' });
    expect(result.code).toBe(0);
    expect(requests).toHaveLength(0);
    expect(result.out).toMatch(/skipped \(new sitemap unreadable: /);
  });
});
