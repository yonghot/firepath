#!/usr/bin/env node
/**
 * scripts/indexnow.mjs — postbuild IndexNow submission (부속I T14, K19, K22).
 *
 * Reads the prerendered sitemap written by `next build`
 * (.next/server/app/sitemap.xml.body, the same output src/app/sitemap.ts
 * emits), compares it with the sitemap that is live right now (the previous
 * deployment, still served while this build runs) and submits only the URLs
 * that are new, have a different lastmod, or were listed before and are now
 * absent (removed or newly noindexed). Bing/Yandex/Naver consume IndexNow;
 * Google has NOT adopted it (do not report this as Google progress).
 *
 * Runs ONLY when VERCEL_ENV === 'production' and INDEXNOW_KEY is set. Never
 * fails the deploy. If the previous sitemap cannot be read the run is skipped
 * and logged; INDEXNOW_FORCE_ALL=1 submits every current URL (manual use).
 *
 * Overrides (tests point all three at 127.0.0.1): INDEXNOW_ENDPOINT,
 * INDEXNOW_PREV_SITEMAP_URL, INDEXNOW_SITEMAP_OVERRIDE (path of the built sitemap).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CHUNK_SIZE = 10_000;
const FETCH_TIMEOUT_MS = 10_000;
const SITEMAP_BODY_PATH = process.env.INDEXNOW_SITEMAP_OVERRIDE || path.resolve(process.cwd(), '.next/server/app/sitemap.xml.body');
const INDEXNOW_ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';

function parseSitemap(xml) {
  const entries = new Map();
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
    const loc = block[1].match(/<loc>([^<]+)<\/loc>/)?.[1]?.trim();
    if (!loc) continue;
    entries.set(loc, block[1].match(/<lastmod>([^<]+)<\/lastmod>/)?.[1]?.trim() ?? '');
  }
  return entries;
}

async function fetchPreviousSitemap(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { entries: parseSitemap(await res.text()) };
  } catch (err) {
    return { error: err?.message ?? String(err) };
  }
}

function sameHost(url, host) {
  try {
    return new URL(url).hostname === host;
  } catch {
    return false;
  }
}

async function main() {
  const vercelEnv = process.env.VERCEL_ENV;
  const key = process.env.INDEXNOW_KEY?.trim();

  if (vercelEnv !== 'production') {
    console.log(`[indexnow] skipping: VERCEL_ENV=${vercelEnv || '(unset)'} (production only)`);
    return;
  }
  if (!key) {
    console.log('[indexnow] skipping: INDEXNOW_KEY not set');
    return;
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com';
  const host = new URL(appUrl).hostname;

  let xml;
  try {
    xml = await readFile(SITEMAP_BODY_PATH, 'utf8');
  } catch (err) {
    console.log(`[indexnow] skipping: could not read sitemap output (${err?.message ?? err})`);
    return;
  }

  const current = parseSitemap(xml);
  if (current.size === 0) {
    console.log('[indexnow] skipping: sitemap contained zero URLs');
    return;
  }

  let urls;
  let summary;
  if (process.env.INDEXNOW_FORCE_ALL === '1') {
    urls = [...current.keys()];
    summary = `forced full submit of ${urls.length} urls`;
  } else {
    const previousUrl = process.env.INDEXNOW_PREV_SITEMAP_URL || `${appUrl.replace(/\/$/, '')}/sitemap.xml`;
    const previous = await fetchPreviousSitemap(previousUrl);
    if (!previous.entries) {
      console.log(`[indexnow] skipping: previous sitemap unavailable (${previous.error}); set INDEXNOW_FORCE_ALL=1 for a full submit`);
      return;
    }
    const added = [...current.keys()].filter((url) => !previous.entries.has(url));
    const changed = [...current.keys()].filter((url) => previous.entries.has(url) && previous.entries.get(url) !== current.get(url));
    const removed = [...previous.entries.keys()].filter((url) => !current.has(url));
    urls = [...added, ...changed, ...removed];
    summary = `${added.length} new, ${changed.length} changed, ${removed.length} removed`;
  }

  urls = urls.filter((url) => sameHost(url, host));
  if (urls.length === 0) {
    console.log('[indexnow] no new, changed or removed URLs; nothing to submit');
    return;
  }

  const keyLocation = `${appUrl.replace(/\/$/, '')}/${key}.txt`;
  const endpointHost = new URL(INDEXNOW_ENDPOINT).hostname;
  let submitted = 0;

  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation, urlList: chunk }),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      console.log(`[indexnow] POST ${endpointHost} -> ${res.status} (${chunk.length} urls)`);
      if (res.ok) {
        submitted += chunk.length;
      } else {
        console.error(`[indexnow] submission failed: HTTP ${res.status}`);
      }
    } catch (err) {
      // Never fail the deploy on a network/API error.
      console.error(`[indexnow] submission error: ${err?.message ?? err}`);
    }
  }

  console.log(`[indexnow] submitted ${submitted} of ${urls.length} urls (${summary})`);
}

main().catch((err) => {
  // Absolute last-resort guard — this script must never cause a non-zero
  // postbuild exit code.
  console.error(`[indexnow] unexpected error (swallowed): ${err?.message ?? err}`);
});
