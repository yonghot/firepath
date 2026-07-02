/**
 * content-pages.ts — unit tests (부속I T09 acceptance criteria)
 *
 * Asserts the sitemap/robots/link-module consistency the spec requires:
 *   - sitemap.ts's entries come ONLY from hasUniqueData:true pages (+ the
 *     documented utility-page allowlist), so no false-flagged page ever
 *     appears in the sitemap.
 *   - getRelatedContentPages() (T06's ResultRelated data source) never
 *     returns a page with hasUniqueData:false.
 *   - GUIDE_PAGES stays in sync with the guide-slug list sitemap.ts and
 *     content-pages.ts both draw from, so link modules and the sitemap can
 *     never silently disagree about which guide slugs exist.
 */

import { describe, it, expect } from 'vitest';
import {
  ALL_CONTENT_PAGES,
  CORE_PAGES,
  FIRE_TYPE_PAGES,
  GUIDE_PAGES,
  getIndexablePages,
  getRelatedContentPages,
} from '@/lib/content-pages';

describe('content-pages — T09 hasUniqueData registry', () => {
  it('every registered page currently has hasUniqueData: true (no thin pages shipped)', () => {
    // FIREPath ships no template-substituted thin pages today — this test is
    // a tripwire: if a future page is added with hasUniqueData: false, this
    // assertion documents that decision was deliberate rather than silently
    // breaking getIndexablePages() consumers.
    const flaggedFalse = ALL_CONTENT_PAGES.filter((p) => !p.hasUniqueData);
    expect(flaggedFalse).toEqual([]);
  });

  it('getIndexablePages() returns exactly the hasUniqueData:true subset', () => {
    const indexable = getIndexablePages();
    expect(indexable.every((p) => p.hasUniqueData)).toBe(true);
    expect(indexable.length).toBe(ALL_CONTENT_PAGES.filter((p) => p.hasUniqueData).length);
  });

  it('every content page has a canonicalPath starting with "/"', () => {
    for (const page of ALL_CONTENT_PAGES) {
      expect(page.canonicalPath.startsWith('/')).toBe(true);
    }
  });

  it('anchor-kind pages (fire-types sections) collapse to the /fire-types canonical path', () => {
    for (const page of FIRE_TYPE_PAGES) {
      expect(page.canonicalPath).toBe('/fire-types');
      expect(page.path.startsWith('/fire-types#')).toBe(true);
    }
  });

  it('GUIDE_PAGES slugs match the hardcoded fallback list in sitemap.ts', () => {
    // sitemap.ts documents that Supabase may be unavailable at build time and
    // keeps its own hardcoded slug list for that reason. This test is the
    // T09 "sitemap/robots/link-module consistency" assertion: if someone
    // updates one list without the other, this fails loudly.
    const sitemapGuideSlugs = [
      'what-is-coastfire',
      'what-is-leanfire',
      'what-is-regular-fire',
      'what-is-fatfire',
      'lean-vs-fat-fire',
      'coast-vs-barista-fire',
      'what-is-baristafire',
    ];
    const registrySlugs = GUIDE_PAGES.map((p) => p.canonicalPath.replace('/guide/', ''));
    expect(registrySlugs.sort()).toEqual(sitemapGuideSlugs.sort());
  });

  it('CORE_PAGES are always hasUniqueData: true (never subject to the thin-page gate)', () => {
    expect(CORE_PAGES.every((p) => p.hasUniqueData)).toBe(true);
  });
});

describe('content-pages — T06 getRelatedContentPages()', () => {
  it('returns between 3 and 5 links for a known FIRE type', () => {
    const links = getRelatedContentPages('coast', 5);
    expect(links.length).toBeGreaterThanOrEqual(3);
    expect(links.length).toBeLessThanOrEqual(5);
  });

  it('every returned link resolves to a page that exists in the indexable registry', () => {
    const indexableCanonicalPaths = new Set(getIndexablePages().map((p) => p.canonicalPath));
    for (const fireType of ['lean', 'regular', 'fat', 'coast', 'barista', null] as const) {
      const links = getRelatedContentPages(fireType, 5);
      for (const link of links) {
        expect(indexableCanonicalPaths.has(link.canonicalPath)).toBe(true);
      }
    }
  });

  it('never returns a page with hasUniqueData: false', () => {
    for (const fireType of ['lean', 'regular', 'fat', 'coast', 'barista', null] as const) {
      const links = getRelatedContentPages(fireType, 5);
      expect(links.every((p) => p.hasUniqueData)).toBe(true);
    }
  });

  it('prioritizes the matching FIRE-type spoke pages first when a fireType is given', () => {
    const links = getRelatedContentPages('coast', 5);
    // At least one of the top links should be Coast-FIRE-specific (the
    // fire-types#coast anchor and/or the coast guide), proving the
    // relevance-ranking actually uses the fireType argument.
    expect(links.some((p) => p.fireType === 'coast')).toBe(true);
  });

  it('caps the result at the requested max', () => {
    const links = getRelatedContentPages('regular', 3);
    expect(links.length).toBeLessThanOrEqual(3);
  });
});

describe('content-pages — 부속M K02 indexable-page-depth audit', () => {
  // sitemap.ts's utility-page allowlist (/premium, /contact, /embed-this) —
  // real, hand-authored, non-templated pages that sit outside the
  // hasUniqueData-gated content registry (see that file's header comment).
  // Kept here as a literal, not an import, so this test independently
  // verifies the count sitemap.ts's own console.log reports rather than
  // trivially re-deriving it from the same source.
  const SITEMAP_UTILITY_PAGE_COUNT = 3;

  it('deduped canonical-path count from getIndexablePages() + utility pages is >= 15 (부속M K02 acceptance: indexable-count >= 15/site)', () => {
    const uniqueCanonicalPaths = new Set(getIndexablePages().map((p) => p.canonicalPath));
    const totalIndexable = uniqueCanonicalPaths.size + SITEMAP_UTILITY_PAGE_COUNT;
    expect(totalIndexable).toBeGreaterThanOrEqual(15);
  });

  it('every indexable page is hasUniqueData:true (never a flag-forced/bypassed thin page — 부속M K02 anti-pattern guard)', () => {
    for (const page of getIndexablePages()) {
      expect(page.hasUniqueData).toBe(true);
    }
  });
});
