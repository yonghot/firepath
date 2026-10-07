#!/usr/bin/env node
// K19-D changed-URL IndexNow postbuild (contracts.md K19/K19-D/K22). Template from D:\ClaudeCode\AppFarm\scripts\templates.
// Copy unchanged to scripts/indexnow.mjs; package.json "postbuild": "node scripts/indexnow.mjs". Google does not consume IndexNow.
// Runs before promotion: a crawl in the seconds until the new deployment is live still sees the old one.
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CHUNK_SIZE = 10_000;
const TIMEOUT_MS = 10_000;
const DEADLINE_MS = 60_000;
const ENTITIES = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };

const message = (err) => (err instanceof Error ? err.message : String(err));
const decode = (s) => s.trim().replace(/&(amp|lt|gt|quot|apos);/g, (_, e) => ENTITIES[e]);
const tag = (block, name) => {
  const m = block.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`));
  if (!m) return undefined;
  const cdata = m[1].trim().match(/^<!\[CDATA\[([\s\S]*)\]\]>$/);
  return cdata ? cdata[1].trim() : decode(m[1]);
};

export function parseSitemap(raw) {
  const xml = raw.replace(/<!--[\s\S]*?-->/g, "");
  // A truncated 200 body would otherwise read as "the rest of the site was removed".
  if (!/<\/(urlset|sitemapindex)>\s*$/.test(xml)) throw new Error("not a complete sitemap document");
  if (/<sitemapindex[\s>]/.test(xml)) {
    const children = [...xml.matchAll(/<sitemap\b[^>]*>([\s\S]*?)<\/sitemap>/g)].map((m) => tag(m[1], "loc"));
    if (!children.length || children.some((c) => !c)) throw new Error("sitemap index lists no usable sitemaps");
    return { children };
  }
  if (!/<urlset[\s>]/.test(xml)) throw new Error("response is not a sitemap");
  const entries = [...xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/g)].map((m) => ({
    loc: new URL(tag(m[1], "loc") ?? "").href,
    lastmod: tag(m[1], "lastmod") ?? "",
  }));
  if (!entries.length) throw new Error("sitemap has no <url> entries");
  return { entries };
}

const sameLastmod = (a, b) => a === b || (a !== "" && b !== "" && Date.parse(a) === Date.parse(b) && !Number.isNaN(Date.parse(a)));

export function diffSitemaps(prev, next) {
  const before = new Map(prev.map((e) => [e.loc, e.lastmod]));
  const after = new Map(next.map((e) => [e.loc, e.lastmod]));
  const added = [];
  const changed = [];
  for (const [loc, lastmod] of after) {
    if (!before.has(loc)) added.push(loc);
    else if (!sameLastmod(before.get(loc), lastmod)) changed.push(loc);
  }
  const removed = [...before.keys()].filter((loc) => !after.has(loc));
  return { added, removed, changed };
}

async function loadEntries(read) {
  const root = parseSitemap(await read("/sitemap.xml"));
  if (root.entries) return root.entries;
  const entries = [];
  for (const child of root.children) {
    const u = new URL(child);
    const { entries: part } = parseSitemap(await read(u.pathname + u.search));
    if (!part) throw new Error(`nested sitemap index at ${child}`);
    entries.push(...part);
  }
  return entries;
}

async function fetchText(url, fetchImpl) {
  const res = await fetchImpl(url, { redirect: "follow", signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`);
  return res.text();
}

async function isNoindex(appDir, url) {
  const p = new URL(url).pathname.replace(/\/$/, "") || "/index";
  try {
    const html = await readFile(path.join(appDir, `${p}.html`), "utf8");
    return /<meta[^>]+name="robots"[^>]+content="[^"]*noindex/i.test(html);
  } catch {
    return false;
  }
}

export async function run({ env = process.env, cwd = process.cwd(), fetchImpl = fetch, log = console.log } = {}) {
  const dryRun = env.INDEXNOW_DRY_RUN === "1";
  const key = env.INDEXNOW_KEY?.trim();
  if (env.VERCEL_ENV !== "production" && !dryRun) return log("indexnow: skipped (not a production build)");
  if (!key && !dryRun) return log("indexnow: skipped (INDEXNOW_KEY unset)");

  const appDir = path.join(cwd, ".next", "server", "app");
  let next;
  try {
    next = await loadEntries((p) => {
      if (p.includes("?")) throw new Error(`no build file for ${p}`);
      return readFile(path.join(appDir, `${p}.body`), "utf8");
    });
  } catch (err) {
    return log(`indexnow: skipped (new sitemap unreadable: ${message(err)})`);
  }
  const host = new URL(next[0].loc).hostname;
  const origin = env.INDEXNOW_PROD_ORIGIN || `https://${host}`;

  // Fail closed: without the live sitemap every URL would look new, which is the full resubmission K19-D forbids.
  let prev;
  try {
    prev = await loadEntries((p) => fetchText(new URL(p, origin), fetchImpl));
  } catch (err) {
    return log(`indexnow: comparison failed, nothing submitted (production sitemap: ${message(err)})`);
  }
  if (!prev.some((e) => new URL(e.loc).hostname === host)) {
    return log(`indexnow: comparison failed, nothing submitted (production sitemap has no urls on ${host})`);
  }

  const { added, removed, changed } = diffSitemaps(prev, next);
  const delta = [...added, ...removed, ...changed];
  const onHost = (u) => new URL(u).hostname === host;
  const urls = delta.filter(onHost);
  let noindexed = 0;
  for (const u of removed.filter(onHost)) if (await isNoindex(appDir, u)) noindexed++;
  const unsent = (list, reason) => {
    log(`indexnow: WARNING ${list.length} changed urls not submitted (${reason}); the next build compares against the new live sitemap, so they are not retried:`);
    for (const u of list) log(`indexnow: unsent ${u}`);
  };
  log(
    `indexnow: delta vs ${origin} — ${added.length} added, ${removed.length} removed (${noindexed} now noindex), ` +
      `${changed.length} lastmod changed, ${delta.length - urls.length} other-host dropped; ${next.length} in new sitemap`,
  );
  if (!urls.length) return log("indexnow: no changed urls, nothing submitted");

  if (key) {
    try {
      if ((await fetchText(new URL(`/${key}.txt`, origin), fetchImpl)).trim() !== key) throw new Error("body is not INDEXNOW_KEY");
    } catch (err) {
      log(`indexnow: skipped (key file check failed: ${message(err)})`);
      return unsent(urls, "key file check failed");
    }
  }
  if (dryRun) {
    for (const u of urls) log(`indexnow: would submit ${u}`);
    return log(`indexnow: dry run, nothing submitted${key ? "" : " (key file not checked: INDEXNOW_KEY unset)"}`);
  }

  const endpoint = env.INDEXNOW_ENDPOINT || "https://api.indexnow.org/indexnow";
  let submitted = 0;
  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const urlList = urls.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetchImpl(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8" },
        body: JSON.stringify({ host, key, keyLocation: `https://${host}/${key}.txt`, urlList }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      log(`indexnow: HTTP ${res.status} for ${urlList.length} urls`);
      if (res.ok) submitted += urlList.length;
      else unsent(urlList, `IndexNow HTTP ${res.status}`);
    } catch (err) {
      log(`indexnow: chunk submission failed (${message(err)}) — non-fatal, continuing`);
      unsent(urlList, "request failed");
    }
  }
  log(`indexnow: submitted ${submitted} of ${urls.length} changed urls`);
}

const samePath = (a, b) => {
  try {
    return realpathSync(a).toLowerCase() === realpathSync(b).toLowerCase();
  } catch {
    return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
  }
};
if (process.argv[1] && samePath(process.argv[1], fileURLToPath(import.meta.url))) {
  setTimeout(() => {
    console.log(`indexnow: gave up after ${DEADLINE_MS / 1000}s — deploy unaffected`);
    process.exit(0);
  }, DEADLINE_MS).unref();
  run()
    .catch((err) => console.log(`indexnow: unexpected error (${message(err)}) — swallowed, deploy unaffected`))
    // IndexNow is best-effort and must never fail the deploy.
    .finally(() => process.exit(0));
}
