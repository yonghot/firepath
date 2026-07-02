#!/usr/bin/env node
/**
 * scripts/indexnow.mjs — postbuild IndexNow submission (부속I T14).
 *
 * Submits every URL from the quality-gated sitemap (the SAME source of truth
 * as src/app/sitemap.ts — this script reads the prerendered
 * .next/server/app/sitemap.xml.body output written by `next build`, so the
 * URL list can never drift from what sitemap.ts actually emits) to
 * https://api.indexnow.org/indexnow. Bing/Yandex/Naver consume this; Google
 * has NOT adopted IndexNow (do not report this as Google progress).
 *
 * Runs ONLY when:
 *   - process.env.VERCEL_ENV === 'production' (skip preview/dev builds), AND
 *   - process.env.INDEXNOW_KEY is set (nothing to authenticate with otherwise)
 * Non-zero exit / network errors are ALWAYS swallowed — this must never fail
 * the deploy. Chunks at 10,000 URLs per IndexNow's documented limit (moot at
 * this site's current scale, kept for correctness/future growth).
 */

import { readFile } from 'node:fs/promises';
import path from 'node:path';

const CHUNK_SIZE = 10_000;
const SITEMAP_BODY_PATH = path.resolve(process.cwd(), '.next/server/app/sitemap.xml.body');
const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';

async function main() {
  const vercelEnv = process.env.VERCEL_ENV;
  const key = process.env.INDEXNOW_KEY?.trim();

  if (vercelEnv !== 'production') {
    console.log(`[indexnow] skipping: VERCEL_ENV=${vercelEnv ?? '(unset)'} (production only)`);
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

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) {
    console.log('[indexnow] skipping: sitemap contained zero URLs');
    return;
  }

  const keyLocation = `${appUrl.replace(/\/$/, '')}/${key}.txt`;
  let submitted = 0;

  for (let i = 0; i < urls.length; i += CHUNK_SIZE) {
    const chunk = urls.slice(i, i + CHUNK_SIZE);
    try {
      const res = await fetch(INDEXNOW_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
        body: JSON.stringify({ host, key, keyLocation, urlList: chunk }),
        signal: AbortSignal.timeout(10_000),
      });
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

  console.log(`[indexnow] submitted ${submitted} urls`);
}

main().catch((err) => {
  // Absolute last-resort guard — this script must never cause a non-zero
  // postbuild exit code.
  console.error(`[indexnow] unexpected error (swallowed): ${err?.message ?? err}`);
});
