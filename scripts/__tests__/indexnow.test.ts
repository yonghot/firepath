/**
 * scripts/indexnow.mjs — behaviour tests (부속I T14, K19, K22).
 *
 * The script is a standalone postbuild program, so each case spawns it with
 * VERCEL_ENV=production and a fake key. Every request must stay on 127.0.0.1:
 * the endpoint and the previous-sitemap URL are overridden to a local server,
 * and a preloaded fetch guard throws (and prints a marker the tests assert is
 * absent) for any other host, so a regression can never reach api.indexnow.org.
 */

import { afterAll, beforeAll, describe, it, expect } from 'vitest';
import { spawn } from 'node:child_process';
import { createServer, type IncomingMessage, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(__dirname, '../..');
const SCRIPT = path.join(ROOT, 'scripts', 'indexnow.mjs');
const FAKE_KEY = 'unit-test-key-0000';
const BLOCKED = 'BLOCKED_EXTERNAL_FETCH';

const sitemap = (entries: Array<[string, string?]>) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
    .map(([loc, lastmod]) => `<url>\n<loc>${loc}</loc>\n${lastmod ? `<lastmod>${lastmod}</lastmod>\n` : ''}<changefreq>monthly</changefreq>\n</url>`)
    .join('\n')}\n</urlset>`;

const HOST = 'https://gofirepath.com';
const page = (p: string) => (p === '' ? HOST : `${HOST}${p}`);

interface Recorded {
  method: string;
  url: string;
  body: string;
  contentType: string | undefined;
}

let tmp: string;
let server: Server;
let port: number;
let requests: Recorded[] = [];
let prevSitemap: { status: number; body: string } = { status: 200, body: '' };
let postStatus = 200;

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

beforeAll(async () => {
  tmp = mkdtempSync(path.join(tmpdir(), 'indexnow-test-'));
  writeFileSync(
    path.join(tmp, 'guard.mjs'),
    `const realFetch = globalThis.fetch;
globalThis.fetch = (input, init) => {
  const raw = typeof input === 'string' ? input : (input && input.url) || String(input);
  const host = new URL(raw).hostname;
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
    if (req.method === 'GET') {
      res.writeHead(prevSitemap.status, { 'content-type': 'application/xml' });
      res.end(prevSitemap.body);
    } else {
      res.writeHead(postStatus);
      res.end();
    }
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  port = (server.address() as AddressInfo).port;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
  rmSync(tmp, { recursive: true, force: true });
});

interface RunResult {
  code: number | null;
  out: string;
  err: string;
}

async function run(options: {
  current?: string;
  env?: Record<string, string>;
  endpoint?: string;
}): Promise<RunResult> {
  const sitemapPath = path.join(tmp, 'sitemap.xml.body');
  writeFileSync(sitemapPath, options.current ?? '');
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    VERCEL_ENV: 'production',
    INDEXNOW_KEY: FAKE_KEY,
    INDEXNOW_ENDPOINT: options.endpoint ?? `http://127.0.0.1:${port}/indexnow`,
    INDEXNOW_PREV_SITEMAP_URL: `http://127.0.0.1:${port}/prev-sitemap.xml`,
    INDEXNOW_SITEMAP_OVERRIDE: sitemapPath,
    ...options.env,
  };
  return new Promise((resolve) => {
    const child = spawn(process.execPath, ['--import', pathToFileURL(path.join(tmp, 'guard.mjs')).href, SCRIPT], { cwd: ROOT, env });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => (out += chunk));
    child.stderr.on('data', (chunk) => (err += chunk));
    child.on('close', (code) => resolve({ code, out, err }));
  });
}

function posts(): Recorded[] {
  return requests.filter((r) => r.method === 'POST');
}

function reset(status = 200, body = '', post = 200) {
  requests = [];
  prevSitemap = { status, body };
  postStatus = post;
}

describe('indexnow.mjs submits only what changed', () => {
  it('posts new, changed-lastmod and removed URLs, and nothing else', async () => {
    reset(
      200,
      sitemap([
        [page(''), '2026-10-01'],
        [page('/guide'), '2026-10-01'],
        [page('/fire-types'), '2026-10-01'],
        [page('/old-page'), '2026-10-01'],
      ]),
    );
    const result = await run({
      current: sitemap([
        [page(''), '2026-10-01'],
        [page('/guide'), '2026-10-07'],
        [page('/fire-types'), '2026-10-01'],
        [page('/llms-new'), '2026-10-07'],
      ]),
    });

    expect(result.code).toBe(0);
    expect(result.err).not.toContain(BLOCKED);
    expect(posts()).toHaveLength(1);
    const payload = JSON.parse(posts()[0].body);
    expect([...payload.urlList].sort()).toEqual([page('/guide'), page('/llms-new'), page('/old-page')].sort());
    expect(payload.host).toBe('gofirepath.com');
    expect(payload.key).toBe(FAKE_KEY);
    expect(payload.keyLocation).toBe(`${HOST}/${FAKE_KEY}.txt`);
    expect(posts()[0].contentType).toMatch(/application\/json/);
    expect(requests.filter((r) => r.method === 'GET').map((r) => r.url)).toEqual(['/prev-sitemap.xml']);
  });

  it('logs the endpoint host, the HTTP status and the URL count', async () => {
    reset(200, sitemap([[page(''), '2026-10-01']]), 202);
    const result = await run({ current: sitemap([[page(''), '2026-10-07']]) });
    expect(result.out).toContain('[indexnow] POST 127.0.0.1 -> 202 (1 urls)');
    expect(result.out).not.toContain(FAKE_KEY);
    expect(result.err).not.toContain(FAKE_KEY);
  });

  it('submits nothing when no URL is new, changed or removed', async () => {
    const same = sitemap([[page(''), '2026-10-07'], [page('/guide'), '2026-10-07']]);
    reset(200, same);
    const result = await run({ current: same });
    expect(result.code).toBe(0);
    expect(posts()).toHaveLength(0);
    expect(result.out).toMatch(/nothing to submit/);
  });

  it('skips with a log when the previous sitemap cannot be read, unless a full submit is forced', async () => {
    const current = sitemap([[page(''), '2026-10-07'], [page('/guide'), '2026-10-07'], [page('/fire-types'), '2026-10-07']]);

    reset(503, 'down');
    const skipped = await run({ current });
    expect(skipped.code).toBe(0);
    expect(posts()).toHaveLength(0);
    expect(skipped.out).toMatch(/previous sitemap unavailable/);
    expect(skipped.out).toMatch(/INDEXNOW_FORCE_ALL=1/);

    reset(503, 'down');
    const forced = await run({ current, env: { INDEXNOW_FORCE_ALL: '1' } });
    expect(forced.code).toBe(0);
    expect(posts()).toHaveLength(1);
    expect([...JSON.parse(posts()[0].body).urlList].sort()).toEqual([page(''), page('/guide'), page('/fire-types')].sort());
    expect(forced.err).not.toContain(BLOCKED);
  });

  it('never submits URLs from another host', async () => {
    reset(200, sitemap([['https://other.example/old', '2026-10-01']]));
    await run({ current: sitemap([[page('/guide'), '2026-10-07']]) });
    expect(JSON.parse(posts()[0].body).urlList).toEqual([page('/guide')]);
  });

  it('skips outside production and without a key, with no request at all', async () => {
    reset(200, sitemap([[page(''), '2026-10-01']]));
    const preview = await run({ current: sitemap([[page(''), '2026-10-07']]), env: { VERCEL_ENV: 'preview' } });
    expect(preview.out).toMatch(/skipping/);
    const unset = await run({ current: sitemap([[page(''), '2026-10-07']]), env: { VERCEL_ENV: '' } });
    expect(unset.out).toMatch(/skipping/);
    const noKey = await run({ current: sitemap([[page(''), '2026-10-07']]), env: { INDEXNOW_KEY: '' } });
    expect(noKey.out).toMatch(/INDEXNOW_KEY not set/);
    expect(requests).toHaveLength(0);
  });

  it('exits 0 when the endpoint is unreachable and still never touches another host', async () => {
    const closed = createServer();
    await new Promise<void>((resolve) => closed.listen(0, '127.0.0.1', resolve));
    const closedPort = (closed.address() as AddressInfo).port;
    await new Promise<void>((resolve) => closed.close(() => resolve()));

    reset(200, sitemap([[page(''), '2026-10-01']]));
    const result = await run({ current: sitemap([[page(''), '2026-10-07']]), endpoint: `http://127.0.0.1:${closedPort}/indexnow` });
    expect(result.code).toBe(0);
    expect(result.err).toMatch(/submission error/);
    expect(result.err).not.toContain(BLOCKED);
  });

  it('keeps api.indexnow.org only as the default when no override is set', () => {
    const source = readFileSync(SCRIPT, 'utf8');
    const occurrences = source.match(/https:\/\/api\.indexnow\.org\/indexnow/g) ?? [];
    expect(occurrences).toHaveLength(1);
    expect(source).toMatch(/process\.env\.INDEXNOW_ENDPOINT\s*\|\|\s*'https:\/\/api\.indexnow\.org\/indexnow'/);
  });
});

describe('indexnow.mjs reads the built sitemap', () => {
  it('extracts every <loc> URL from the sitemap body', async () => {
    reset(503, 'down');
    const result = await run({
      current: sitemap([[page('')], [page('/guide')], [page('/fire-types')]]),
      env: { INDEXNOW_FORCE_ALL: '1' },
    });
    expect(result.code).toBe(0);
    expect([...JSON.parse(posts()[0].body).urlList]).toEqual([page(''), page('/guide'), page('/fire-types')]);
  });

  it('submits nothing for a sitemap with zero <url> entries', async () => {
    reset(200, sitemap([[page(''), '2026-10-01']]));
    const result = await run({ current: '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>' });
    expect(result.code).toBe(0);
    expect(posts()).toHaveLength(0);
    expect(result.out).toMatch(/zero URLs/);
  });

  it('does not choke on malformed or partial XML', async () => {
    reset(200, sitemap([[page(''), '2026-10-01']]));
    const result = await run({ current: '<not xml at all' });
    expect(result.code).toBe(0);
    expect(posts()).toHaveLength(0);
  });
});
