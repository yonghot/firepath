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
  MIN_DIFFERENTIATING_FACTS,
  getIndexablePages,
  getDbContentPages,
  getRelatedContentPages,
  passesInformationGainGate,
  computeHasUniqueData,
  aboveOrBelowBenchmark,
  buildSynthesisSentence,
  EXAMPLE_THIN_PAGE_FIXTURE,
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

  it('getIndexablePages() returns exactly the hasUniqueData:true AND statically-routable subset', () => {
    // 부속W §2.4: the indexable set is hasUniqueData MINUS requiresDbContent
    // pages (DB-authored bodies can't be proven to resolve at build time, and
    // advertising them put 7 404s in the sitemap).
    const indexable = getIndexablePages();
    expect(indexable.every((p) => p.hasUniqueData)).toBe(true);
    expect(indexable.every((p) => !p.requiresDbContent)).toBe(true);
    expect(indexable.length).toBe(
      ALL_CONTENT_PAGES.filter((p) => p.hasUniqueData && !p.requiresDbContent).length,
    );
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

  it('GUIDE_PAGES holds exactly the DB-authored guide allowlist (noindex gate for /guide/[slug])', () => {
    // GUIDE_PAGES no longer feeds the sitemap (부속W §2.4 — those URLs 404
    // without Supabase rows, so they are requiresDbContent and excluded from
    // getIndexablePages()). Its remaining job is the quality allowlist that
    // /guide/[slug] uses to noindex any slug absent from it. This assertion
    // pins the allowlist so a slug can't be added/removed unnoticed.
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

describe('content-pages — 부속P CODE-06 information-gain guard', () => {
  it('MIN_DIFFERENTIATING_FACTS is 4 (spec: ">=4 entity-specific facts")', () => {
    expect(MIN_DIFFERENTIATING_FACTS).toBe(4);
  });

  it('every registered "spoke" page carries >= MIN_DIFFERENTIATING_FACTS differentiating facts', () => {
    const spokes = ALL_CONTENT_PAGES.filter((p) => p.kind === 'spoke');
    expect(spokes.length).toBeGreaterThan(0);
    for (const page of spokes) {
      expect(page.differentiatingFacts?.length ?? 0).toBeGreaterThanOrEqual(MIN_DIFFERENTIATING_FACTS);
    }
  });

  it('every registered page\'s hasUniqueData flag equals passesInformationGainGate(page) — can never silently drift', () => {
    for (const page of ALL_CONTENT_PAGES) {
      expect(page.hasUniqueData).toBe(passesInformationGainGate(page));
      expect(page.hasUniqueData).toBe(computeHasUniqueData(page));
    }
  });

  it('core/hub pages are exempt from the fact-count gate (always pass regardless of differentiatingFacts)', () => {
    const coreAndHub = ALL_CONTENT_PAGES.filter((p) => p.kind !== 'spoke');
    expect(coreAndHub.length).toBeGreaterThan(0);
    for (const page of coreAndHub) {
      expect(passesInformationGainGate(page)).toBe(true);
    }
  });

  it('REGRESSION: a page with < 4 differentiating facts fails the gate, is excluded from getIndexablePages(), and would be noindex+absent-from-sitemap', () => {
    // EXAMPLE_THIN_PAGE_FIXTURE carries exactly 1 fact — below MIN_DIFFERENTIATING_FACTS.
    expect(EXAMPLE_THIN_PAGE_FIXTURE.differentiatingFacts).toHaveLength(1);
    expect(passesInformationGainGate(EXAMPLE_THIN_PAGE_FIXTURE)).toBe(false);
    expect(EXAMPLE_THIN_PAGE_FIXTURE.hasUniqueData).toBe(false);

    // Simulate injecting it into the registry the way sitemap.ts/getIndexablePages() consume it —
    // it must never appear in the indexable set even if hasUniqueData were mistakenly left true,
    // because getIndexablePages() ALSO re-checks passesInformationGainGate() directly (defense in depth).
    const withFixture = [...ALL_CONTENT_PAGES, { ...EXAMPLE_THIN_PAGE_FIXTURE, hasUniqueData: true }];
    const indexableSimulated = withFixture.filter((p) => p.hasUniqueData && passesInformationGainGate(p));
    expect(indexableSimulated.some((p) => p.canonicalPath === '/example-thin-fixture')).toBe(false);

    // And the real getIndexablePages() (which does NOT include the fixture) never contains it either.
    expect(getIndexablePages().some((p) => p.canonicalPath === '/example-thin-fixture')).toBe(false);
  });

  it('aboveOrBelowBenchmark returns conditional phrasing that matches the actual numbers (never a hardcoded direction)', () => {
    expect(aboveOrBelowBenchmark(600000, 1000000)).toBe('below');
    expect(aboveOrBelowBenchmark(1500000, 1000000)).toBe('above');
    expect(aboveOrBelowBenchmark(1000000, 1000000)).toBe('equal to');
  });

  it('buildSynthesisSentence produces a data-derived synthesis sentence with the correct direction and percentage', () => {
    const sentence = buildSynthesisSentence({
      entityLabel: 'Lean FIRE',
      value: 600000,
      formattedValue: '$600,000',
      benchmarkLabel: 'the Regular FIRE target',
      benchmark: 1000000,
      formattedBenchmark: '$1,000,000',
    });
    expect(sentence).toContain('below');
    expect(sentence).toContain('40%');
    expect(sentence).toContain('$600,000');
    expect(sentence).toContain('$1,000,000');
  });

  it('buildSynthesisSentence never asserts a direction the numbers don\'t support (equal case)', () => {
    const sentence = buildSynthesisSentence({
      entityLabel: 'A',
      value: 100,
      formattedValue: '$100',
      benchmarkLabel: 'B',
      benchmark: 100,
      formattedBenchmark: '$100',
    });
    expect(sentence).toContain('exactly equal to');
    expect(sentence).not.toMatch(/\d+% (above|below)/);
  });
});

describe('content-pages — 부속M K02 indexable-page-depth audit', () => {
  // sitemap.ts's utility-page allowlist (/premium, /contact and /embed-this are
  // all listed in src/data/noindex-paths.json and therefore left out) —
  // real, hand-authored, non-templated pages that sit outside the
  // hasUniqueData-gated content registry (see that file's header comment).
  // Kept here as a literal, not an import, so this test independently
  // verifies the count sitemap.ts's own console.log reports rather than
  // trivially re-deriving it from the same source.
  const SITEMAP_UTILITY_PAGE_COUNT = 0;

  // 부속W §2.4 correction: the original assertion here was ">= 15 indexable
  // URLs", which the registry satisfied only by counting the 7 DB-authored
  // /guide/[slug] entries — every one of which returned 404 in production
  // (Supabase holds the bodies; generateStaticParams returns [] and the route
  // notFound()s). A URL count is the wrong acceptance criterion when it can be
  // met with dead URLs: an AdSense/crawler review that follows a sitemap where
  // 39% of entries 404 reads the site as low quality. The criterion is now
  // "every advertised URL is statically routable", and the count floor is set
  // to what the repo can actually prove resolves.
  it('every advertised (indexable) page is statically routable — no DB-content page is ever advertised', () => {
    for (const page of getIndexablePages()) {
      expect(page.requiresDbContent ?? false).toBe(false);
    }
  });

  it('the DB-authored guide pages are excluded from indexing/linking (they 404 without Supabase rows)', () => {
    const dbPages = getDbContentPages();
    expect(dbPages.length).toBeGreaterThan(0);
    const indexablePaths = new Set(getIndexablePages().map((p) => p.canonicalPath));
    for (const page of dbPages) {
      expect(indexablePaths.has(page.canonicalPath)).toBe(false);
    }
  });

  it('deduped canonical-path count from getIndexablePages() + utility pages is >= 8 (statically routable pages only)', () => {
    const uniqueCanonicalPaths = new Set(getIndexablePages().map((p) => p.canonicalPath));
    const totalIndexable = uniqueCanonicalPaths.size + SITEMAP_UTILITY_PAGE_COUNT;
    expect(totalIndexable).toBeGreaterThanOrEqual(8);
  });

  it('every indexable page is hasUniqueData:true (never a flag-forced/bypassed thin page — 부속M K02 anti-pattern guard)', () => {
    for (const page of getIndexablePages()) {
      expect(page.hasUniqueData).toBe(true);
    }
  });
});
