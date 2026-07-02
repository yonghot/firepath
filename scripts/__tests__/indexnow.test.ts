/**
 * scripts/indexnow.mjs — unit tests for the URL-extraction logic (부속I T14).
 *
 * indexnow.mjs is a standalone postbuild script whose `main()` runs
 * network/filesystem side effects at module-eval time (it is NOT a pure
 * module of exported functions) — importing it directly here would trigger
 * a real fetch/env read on `vitest run`, which is unsafe/non-deterministic.
 * Instead this test locks in the exact `<loc>` extraction regex the script
 * uses against a realistic sitemap.xml.body fixture, matching the
 * `sitemap.ts`-generated shape (see src/app/sitemap.ts / the build output at
 * .next/server/app/sitemap.xml.body verified manually during this wave).
 */

import { describe, it, expect } from 'vitest';

const SITEMAP_FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
<url>
<loc>https://gofirepath.com</loc>
<lastmod>2026-07-02T09:51:03.186Z</lastmod>
<changefreq>weekly</changefreq>
<priority>1</priority>
</url>
<url>
<loc>https://gofirepath.com/guide</loc>
<lastmod>2026-07-02T09:51:03.186Z</lastmod>
<changefreq>monthly</changefreq>
<priority>0.8</priority>
</url>
<url>
<loc>https://gofirepath.com/fire-types</loc>
<lastmod>2026-07-02T09:51:03.186Z</lastmod>
<changefreq>monthly</changefreq>
<priority>0.8</priority>
</url>
</urlset>`;

/** Mirrors the exact extraction line in scripts/indexnow.mjs. */
function extractUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

describe('indexnow.mjs URL extraction', () => {
  it('extracts every <loc> URL from the sitemap body', () => {
    const urls = extractUrls(SITEMAP_FIXTURE);
    expect(urls).toEqual([
      'https://gofirepath.com',
      'https://gofirepath.com/guide',
      'https://gofirepath.com/fire-types',
    ]);
  });

  it('returns an empty array for a sitemap with zero <url> entries', () => {
    const empty = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n</urlset>';
    expect(extractUrls(empty)).toEqual([]);
  });

  it('does not choke on malformed/partial XML', () => {
    expect(() => extractUrls('<not xml at all')).not.toThrow();
    expect(extractUrls('<not xml at all')).toEqual([]);
  });
});
