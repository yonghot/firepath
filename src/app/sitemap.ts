import type { MetadataRoute } from 'next';
import { getListedContentPages, pageUrl } from '@/lib/indexable-pages';
import { isNoindexed } from '@/lib/noindex-paths';
import { SITE_URL } from '@/lib/site';

/**
 * 부속I T09 (strengthened by 부속P CODE-06) — sitemap enumerates ONLY pages
 * that pass the information-gain gate (getIndexablePages() in
 * src/lib/content-pages.ts requires >=MIN_DIFFERENTIATING_FACTS
 * entity-specific facts for every 'spoke' page), plus the few routes below
 * that are core/utility pages outside that content registry (premium,
 * embed-this, contact) but are still real, non-templated pages. This keeps
 * sitemap.ts, robots (generateMetadata on gated routes), and the T06/T07
 * link modules reading from the exact same source of truth — see
 * content-pages.test.ts for the consistency assertion, including the
 * <4-fact-page-is-excluded regression test.
 *
 * Anchor URLs (e.g. /fire-types#lean) are NOT separate sitemap entries —
 * search engines index the page, not the fragment — so anchor-kind content
 * pages collapse to their canonicalPath and de-dupe here.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const priorityByKind: Record<'core' | 'hub' | 'spoke', number> = {
    core: 0.6,
    hub: 0.8,
    spoke: 0.7,
  };

  const contentPages: MetadataRoute.Sitemap = getListedContentPages().map((page) => ({
    url: pageUrl(page.canonicalPath),
    ...(page.lastModified ? { lastModified: page.lastModified } : {}),
    changeFrequency: page.canonicalPath === '/' ? ('weekly' as const) : ('monthly' as const),
    priority: page.canonicalPath === '/' ? 1.0 : priorityByKind[page.kind],
  }));

  // Utility/commercial pages outside the content-pages registry — real,
  // hand-authored, non-templated pages that aren't part of the
  // FIRE-education content graph the hasUniqueData gate governs.
  // /result and /saved are intentionally excluded (personalized /
  // auth-gated content, already robots-noindexed in their own metadata).
  // A path listed in src/data/noindex-paths.json is dropped by the filter below.
  const utilityPages: MetadataRoute.Sitemap = [
    { path: '/premium', priority: 0.6 },
    { path: '/contact', priority: 0.5 },
    { path: '/embed-this', priority: 0.5 },
  ]
    .filter(({ path }) => !isNoindexed(path))
    .map(({ path, priority }) => ({
      url: `${SITE_URL}${path}`,
      changeFrequency: 'monthly' as const,
      priority,
    }));

  const allEntries = [...contentPages, ...utilityPages];

  // Build-time visibility (부속I T09 acceptance criteria: "count of
  // indexed-intent URLs logged in build output per site").
  console.log(`[sitemap] firepath: ${allEntries.length} indexable URLs`);

  return allEntries;
}
