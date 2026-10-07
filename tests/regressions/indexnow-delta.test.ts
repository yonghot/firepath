// @vitest-environment node
// K19-D changed-URL IndexNow (contracts.md K19-D, K22). Template from D:\ClaudeCode\AppFarm\scripts\templates.
// Copy to tests/regressions/indexnow-delta.test.ts and edit ONLY the CONFIG block; scripts/indexnow.mjs is indexnow-delta.mjs unchanged.
import { afterEach, describe, expect, it, vi } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const CONFIG = {
  script: path.resolve(__dirname, "..", "..", "scripts", "indexnow.mjs"),
  // The repo's app/sitemap.ts (src/app/sitemap.ts in src-layout repos).
  sitemap: path.resolve(__dirname, "..", "..", "src", "app", "sitemap.ts"),
};

type Env = Record<string, string | undefined>;
type RunOptions = { env: Env; cwd: string; fetchImpl: typeof fetch; log: (line: string) => void };
type Hit = { method: string; path: string; body: string };
type Route = { status: number; body: string; location?: string };
type Payload = { host: string; key: string; keyLocation: string; urlList: string[] };

const KEY = "0123456789abcdef0123456789abcdef";
const HOST = "example.com";
const NS = 'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"';
const NOINDEX_HTML = '<!DOCTYPE html><html><head><meta name="robots" content="noindex, follow"/></head><body></body></html>';

let server: Server | undefined;
const dirs: string[] = [];
const external: string[] = [];

// K22: every run in this file goes through this guard; a non-local request fails the test in afterEach.
const guardedFetch: typeof fetch = (input, init) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.hostname !== "127.0.0.1") {
    external.push(url.href);
    return Promise.reject(new Error(`K22: external request to ${url.href}`));
  }
  return fetch(input, init);
};

afterEach(async () => {
  const s = server;
  server = undefined;
  if (s) {
    s.closeAllConnections();
    await new Promise<void>((resolve) => s.close(() => resolve()));
  }
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true });
  expect(external.splice(0)).toEqual([]);
});

const urlset = (entries: Array<[string, string?]>) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset ${NS}>\n${entries
    .map(([p, lastmod]) => `<url>\n<loc>https://${HOST}${p}</loc>\n${lastmod ? `<lastmod>${lastmod}</lastmod>\n` : ""}</url>`)
    .join("\n")}\n</urlset>\n`;

async function serve(routes: Record<string, Route>) {
  const hits: Hit[] = [];
  const s = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => {
      const p = req.url ?? "/";
      const method = req.method ?? "";
      hits.push({ method, path: p, body });
      const route = method === "POST" ? (routes[`POST ${p}`] ?? { status: 200, body: "" }) : (routes[p] ?? { status: 404, body: "not found" });
      res.writeHead(route.status, { "content-type": "text/plain", ...(route.location ? { location: route.location } : {}) }).end(route.body);
    });
  });
  server = s;
  await new Promise<void>((resolve) => s.listen(0, "127.0.0.1", () => resolve()));
  return { origin: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, hits };
}

function build(sitemapBody: string | null, files: Record<string, string> = {}) {
  const dir = mkdtempSync(path.join(tmpdir(), "indexnow-delta-"));
  dirs.push(dir);
  const app = path.join(dir, ".next", "server", "app");
  mkdirSync(app, { recursive: true });
  if (sitemapBody !== null) writeFileSync(path.join(app, "sitemap.xml.body"), sitemapBody);
  for (const [rel, body] of Object.entries(files)) {
    mkdirSync(path.dirname(path.join(app, rel)), { recursive: true });
    writeFileSync(path.join(app, rel), body);
  }
  return dir;
}

async function exec(cwd: string, env: Env, fetchImpl: typeof fetch = guardedFetch) {
  const { run } = (await import(pathToFileURL(CONFIG.script).href)) as { run: (o: RunOptions) => Promise<void> };
  const lines: string[] = [];
  await run({ env, cwd, fetchImpl, log: (line) => lines.push(line) });
  return lines.join("\n");
}

const prodEnv = (origin: string): Env => ({
  VERCEL_ENV: "production",
  INDEXNOW_KEY: KEY,
  INDEXNOW_PROD_ORIGIN: origin,
  INDEXNOW_ENDPOINT: `${origin}/indexnow`,
});
const keyRoute = { [`/${KEY}.txt`]: { status: 200, body: KEY } };
const posts = (hits: Hit[]) => hits.filter((h) => h.method === "POST").map((h) => JSON.parse(h.body) as Payload);
const u = (p: string) => `https://${HOST}${p}`;

describe("K19-D — IndexNow submits only what changed against the live production sitemap", () => {
  it("submits added, removed and lastmod-changed URLs with the host's key location, and nothing unchanged", async () => {
    const live = urlset([["/", "2026-10-01"], ["/same", "2026-10-01"], ["/edited", "2026-10-01"], ["/gone", "2026-10-01"]]);
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: live }, ...keyRoute });
    const cwd = build(urlset([["/", "2026-10-01"], ["/same", "2026-10-01"], ["/edited", "2026-10-08"], ["/new", "2026-10-08"]]));
    const out = await exec(cwd, prodEnv(origin));
    const sent = posts(hits);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.host).toBe(HOST);
    expect(sent[0]?.key).toBe(KEY);
    expect(sent[0]?.keyLocation).toBe(`https://${HOST}/${KEY}.txt`);
    expect([...(sent[0]?.urlList ?? [])].sort()).toEqual([u("/edited"), u("/gone"), u("/new")]);
    expect(out).toMatch(/1 added, 1 removed \(0 now noindex\), 1 lastmod changed, 0 other-host dropped; 4 in new sitemap/);
    expect(out).toMatch(/HTTP 200 for 3 urls/);
    expect(out).toMatch(/submitted 3 of 3 changed urls/);
  });

  it("submits nothing for an identical rebuild, including prerendered noindex pages outside the sitemap", async () => {
    // Regression: the full-list script resent 1,076 Dental URLs (244 sitemap + 832 noindex) on every deploy.
    const xml = urlset([["/", "2026-10-01"], ["/a", "2026-10-02"]]);
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: xml }, ...keyRoute });
    const cwd = build(xml, { "index.html": "<html></html>", "a.html": "<html></html>", "thin/page.html": NOINDEX_HTML });
    const out = await exec(cwd, prodEnv(origin));
    expect(posts(hits)).toEqual([]);
    expect(hits.map((h) => h.path)).toEqual(["/sitemap.xml"]);
    expect(out).toMatch(/no changed urls, nothing submitted/);
  });

  it("treats equivalent loc and lastmod spellings as unchanged", async () => {
    // Next 16 writes <loc> unescaped; an escaped live copy must still match.
    const live = `<urlset ${NS}><url><loc>https://${HOST}</loc><lastmod>2026-10-08</lastmod></url><url><loc>https://${HOST}/q?a=1&amp;b=2</loc></url><url><loc><![CDATA[https://${HOST}/c]]></loc></url><!-- <url><loc>https://${HOST}/commented</loc></url> --></urlset>`;
    const next = `<urlset ${NS}><url><loc>https://${HOST}/</loc><lastmod>2026-10-08T00:00:00.000Z</lastmod></url><url><loc>https://${HOST}/q?a=1&b=2</loc></url><url><loc>https://${HOST}/c</loc></url></urlset>`;
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: live }, ...keyRoute });
    const out = await exec(build(next), prodEnv(origin));
    expect(posts(hits)).toEqual([]);
    expect(out).toMatch(/0 added, 0 removed \(0 now noindex\), 0 lastmod changed/);
  });

  it("submits a URL that left the sitemap and labels it when the new build serves it noindex", async () => {
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"], ["/thin"], ["/deleted"], ["/keep"]]) }, ...keyRoute });
    const out = await exec(build(urlset([["/keep"]]), { "thin.html": NOINDEX_HTML, "index.html": NOINDEX_HTML }), prodEnv(origin));
    expect([...(posts(hits)[0]?.urlList ?? [])].sort()).toEqual([u("/"), u("/deleted"), u("/thin")]);
    expect(out).toMatch(/0 added, 3 removed \(2 now noindex\)/);
  });

  it("reads a new-build sitemap index from its child build files", async () => {
    const index = `<sitemapindex ${NS}><sitemap><loc>https://${HOST}/sitemap/0.xml</loc></sitemap></sitemapindex>`;
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoute });
    const out = await exec(build(index, { "sitemap/0.xml.body": urlset([["/"], ["/new"]]) }), prodEnv(origin));
    expect(posts(hits)[0]?.urlList).toEqual([u("/new")]);
    expect(out).toMatch(/1 added, 0 removed \(0 now noindex\), 0 lastmod changed, 0 other-host dropped; 2 in new sitemap/);
  });

  it("reads a production sitemap index through the production origin", async () => {
    const index = `<sitemapindex ${NS}><sitemap><loc>https://${HOST}/sitemap/0.xml</loc></sitemap><sitemap><loc>https://${HOST}/sitemap/1.xml</loc></sitemap></sitemapindex>`;
    const { origin, hits } = await serve({
      "/sitemap.xml": { status: 200, body: index },
      "/sitemap/0.xml": { status: 200, body: urlset([["/", "2026-10-01"]]) },
      "/sitemap/1.xml": { status: 200, body: urlset([["/b", "2026-10-01"]]) },
      ...keyRoute,
    });
    const out = await exec(build(urlset([["/", "2026-10-01"], ["/b", "2026-10-05"]])), prodEnv(origin));
    expect(posts(hits)[0]?.urlList).toEqual([u("/b")]);
    expect(out).toMatch(/0 added, 0 removed \(0 now noindex\), 1 lastmod changed/);
  });

  it("never sends a URL on another host", async () => {
    const live = `<urlset ${NS}><url><loc>https://${HOST}/</loc></url><url><loc>https://other.example/x</loc></url></urlset>`;
    const next = `<urlset ${NS}><url><loc>https://${HOST}/</loc></url><url><loc>https://other.example/y</loc></url></urlset>`;
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: live }, ...keyRoute });
    const out = await exec(build(next), prodEnv(origin));
    expect(posts(hits)).toEqual([]);
    expect(out).toMatch(/1 added, 1 removed \(0 now noindex\), 0 lastmod changed, 2 other-host dropped/);
    expect(out).toMatch(/no changed urls, nothing submitted/);
  });

  it("splits more than 10,000 changed URLs into 10,000-URL requests", async () => {
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoute });
    const many: Array<[string]> = Array.from({ length: 10_001 }, (_, i) => [`/p/${i}`]);
    const out = await exec(build(urlset([["/"], ...many])), prodEnv(origin));
    expect(posts(hits).map((p) => p.urlList.length)).toEqual([10_000, 1]);
    expect(out).toMatch(/submitted 10001 of 10001 changed urls/);
  });

  it("logs a non-2xx IndexNow answer with its status code and does not throw", async () => {
    const { origin } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoute, "POST /indexnow": { status: 403, body: "" } });
    const out = await exec(build(urlset([["/"], ["/new"]])), prodEnv(origin));
    expect(out).toMatch(/HTTP 403 for 1 urls/);
    expect(out).toMatch(/WARNING 1 changed urls not submitted \(IndexNow HTTP 403\)/);
    expect(out).toMatch(/unsent https:\/\/example\.com\/new/);
    expect(out).toMatch(/submitted 0 of 1 changed urls/);
  });

  it("lists the URLs of a chunk whose request failed, and does not throw", async () => {
    const { origin } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoute });
    const postFails: typeof fetch = (input, init) =>
      init?.method === "POST" ? Promise.reject(new Error("socket hang up")) : guardedFetch(input, init);
    const out = await exec(build(urlset([["/"], ["/new"]])), prodEnv(origin), postFails);
    expect(out).toMatch(/chunk submission failed \(socket hang up\)/);
    expect(out).toMatch(/WARNING 1 changed urls not submitted \(request failed\)/);
    expect(out).toMatch(/unsent https:\/\/example\.com\/new/);
  });

  it("dry run prints the delta and never posts, even outside production", async () => {
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) } });
    const out = await exec(build(urlset([["/"], ["/new"]])), { INDEXNOW_DRY_RUN: "1", INDEXNOW_PROD_ORIGIN: origin });
    expect(hits.map((h) => `${h.method} ${h.path}`)).toEqual(["GET /sitemap.xml"]);
    expect(out).toMatch(/would submit https:\/\/example\.com\/new/);
    expect(out).toMatch(/dry run, nothing submitted \(key file not checked: INDEXNOW_KEY unset\)/);
  });

  it("dry run in a production build checks the key file and still never posts", async () => {
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoute });
    const out = await exec(build(urlset([["/"], ["/new"]])), { ...prodEnv(origin), INDEXNOW_DRY_RUN: "1" });
    expect(hits.map((h) => `${h.method} ${h.path}`)).toEqual(["GET /sitemap.xml", `GET /${KEY}.txt`]);
    expect(out).toMatch(/dry run, nothing submitted$/);
  });
});

describe("K19-D — fails closed: no comparison, no submission", () => {
  const index = `<sitemapindex ${NS}><sitemap><loc>https://${HOST}/sitemap/0.xml</loc></sitemap></sitemapindex>`;
  it.each([
    ["the production sitemap answers 503", { "/sitemap.xml": { status: 503, body: "unavailable" } }],
    ["production serves an HTML page with 200", { "/sitemap.xml": { status: 200, body: "<!doctype html><html><body>Not found</body></html>" } }],
    ["the production sitemap has no URLs", { "/sitemap.xml": { status: 200, body: `<urlset ${NS}></urlset>` } }],
    ["a production sitemap entry has no loc", { "/sitemap.xml": { status: 200, body: `<urlset ${NS}><url><lastmod>2026-10-01</lastmod></url></urlset>` } }],
    ["a child of the production sitemap index fails", { "/sitemap.xml": { status: 200, body: index } }],
    ["the production body is truncated", { "/sitemap.xml": { status: 200, body: urlset([["/"], ["/a"], ["/b"]]).slice(0, 220) } }],
    [
      "production redirects to a sitemap of another host",
      {
        "/sitemap.xml": { status: 308, body: "", location: "/elsewhere.xml" },
        "/elsewhere.xml": { status: 200, body: `<urlset ${NS}><url><loc>https://other.example/</loc></url></urlset>` },
      },
    ],
  ])("when %s", async (_, routes: Record<string, Route>) => {
    const { origin, hits } = await serve({ ...routes, ...keyRoute });
    const out = await exec(build(urlset([["/"], ["/new"]])), prodEnv(origin));
    expect(posts(hits)).toEqual([]);
    expect(hits.some((h) => h.path === `/${KEY}.txt`)).toBe(false);
    expect(out).toMatch(/comparison failed, nothing submitted \(production sitemap/);
  });

  it("when production is unreachable", async () => {
    const down: typeof fetch = () => Promise.reject(new TypeError("fetch failed"));
    const out = await exec(build(urlset([["/"], ["/new"]])), prodEnv("http://127.0.0.1:9"), down);
    expect(out).toMatch(/comparison failed, nothing submitted \(production sitemap: fetch failed\)/);
  });

  it.each([
    ["is missing", {}],
    ["does not contain the key", { [`/${KEY}.txt`]: { status: 200, body: "something else" } }],
  ])("when the live key file %s", async (_, keyRoutes: Record<string, Route>) => {
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoutes });
    const out = await exec(build(urlset([["/"], ["/new"]])), prodEnv(origin));
    expect(posts(hits)).toEqual([]);
    expect(out).toMatch(/skipped \(key file check failed: /);
    expect(out).toMatch(/unsent https:\/\/example\.com\/new/);
  });

  it("when the new build has no readable sitemap, without any request", async () => {
    const { origin, hits } = await serve({ "/sitemap.xml": { status: 200, body: urlset([["/"]]) }, ...keyRoute });
    const out = await exec(build(null), prodEnv(origin));
    expect(hits).toEqual([]);
    expect(out).toMatch(/skipped \(new sitemap unreadable: /);
  });
});

describe("K19 — local and preview builds never submit", () => {
  it.each([
    ["a local next build", { INDEXNOW_KEY: KEY }],
    ["a preview build", { VERCEL_ENV: "preview", INDEXNOW_KEY: KEY }],
    ["a development build", { VERCEL_ENV: "development", INDEXNOW_KEY: KEY }],
    ["production without INDEXNOW_KEY", { VERCEL_ENV: "production", INDEXNOW_KEY: " " }],
  ])("%s makes no request at all", async (_, env: Env) => {
    const calls: string[] = [];
    const spy: typeof fetch = (input) => {
      calls.push(String(input));
      return Promise.reject(new Error("no request expected"));
    };
    const out = await exec(build(urlset([["/"], ["/new"]])), { ...env, INDEXNOW_PROD_ORIGIN: "http://127.0.0.1:9" }, spy);
    expect(calls).toEqual([]);
    expect(out).toMatch(/^indexnow: skipped \((not a production build|INDEXNOW_KEY unset)\)$/);
  });

  it("the postbuild CLI always exits 0", () => {
    const env: Env = {};
    for (const [k, v] of Object.entries(process.env)) if (!k.startsWith("INDEXNOW_") && k !== "VERCEL_ENV") env[k] = v;
    const cwd = build(null);
    const cli = (extra: Env) =>
      spawnSync(process.execPath, [CONFIG.script], { cwd, env: { ...env, ...extra } as NodeJS.ProcessEnv, encoding: "utf8", timeout: 15_000 });
    const local = cli({});
    expect(local.status).toBe(0);
    expect(local.stdout).toMatch(/skipped \(not a production build\)/);
    const prod = cli({ VERCEL_ENV: "production", INDEXNOW_KEY: KEY, INDEXNOW_PROD_ORIGIN: "http://127.0.0.1:9", INDEXNOW_ENDPOINT: "http://127.0.0.1:9/indexnow" });
    expect(prod.status).toBe(0);
    expect(prod.stdout).toMatch(/skipped \(new sitemap unreadable: /);
  });

  it("the K22 guard rejects and records a non-local request (positive control)", async () => {
    await expect(guardedFetch("https://api.indexnow.org/indexnow")).rejects.toThrow(/K22/);
    expect(external.splice(0)).toEqual(["https://api.indexnow.org/indexnow"]);
  });
});

describe("K19-D — this repo's sitemap lastmod does not follow the build clock", () => {
  // A clock-stamped lastmod marks every URL changed on every deploy, which is the full resubmission K19-D forbids.
  it("two builds 26 hours apart give every URL the same lastmod", async () => {
    const snapshot = async (at: number) => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(at);
      vi.resetModules();
      try {
        const mod = (await import(pathToFileURL(CONFIG.sitemap).href)) as { default: () => unknown };
        const entries = (await mod.default()) as Array<{ url: string; lastModified?: string | Date }>;
        return new Map(entries.map((e) => [e.url, e.lastModified instanceof Date ? e.lastModified.toISOString() : String(e.lastModified ?? "")]));
      } finally {
        vi.useRealTimers();
      }
    };
    const now = Date.now();
    const first = await snapshot(now);
    const second = await snapshot(now + 26 * 3_600_000);
    const shared = [...first.keys()].filter((url) => second.has(url));
    expect(shared.length).toBeGreaterThan(0);
    expect(shared.filter((url) => first.get(url) !== second.get(url))).toEqual([]);
  });
});
