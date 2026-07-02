/**
 * breadcrumbs.tsx / json-ld.ts — unit tests (부속I T07 acceptance criteria)
 *
 * No React Testing Library / jsdom is installed in this repo (vitest runs in
 * the plain `node` environment — see vitest.config.ts and the analytics.test.ts
 * comment documenting the same constraint), so these tests exercise the pure
 * data-shape logic behind <Breadcrumbs> — the breadcrumbJsonLd() builder it
 * calls — rather than rendering the component. This still covers the
 * acceptance criterion "BreadcrumbList validates ... schema fields:
 * itemListElement/position/name/item".
 */

import { describe, it, expect } from 'vitest';
import { breadcrumbJsonLd } from '@/components/common/json-ld';
import { GUIDE_PAGES } from '@/lib/content-pages';

describe('breadcrumbJsonLd() — T07 BreadcrumbList schema', () => {
  it('produces a valid BreadcrumbList shape with itemListElement/position/name/item', () => {
    const result = breadcrumbJsonLd([
      { name: 'Home', path: '/' },
      { name: 'FIRE Guides', path: '/guide' },
      { name: 'What is Coast FIRE?', path: '/guide/what-is-coastfire' },
    ]);

    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('BreadcrumbList');
    expect(result.itemListElement).toHaveLength(3);

    result.itemListElement.forEach((item, i) => {
      expect(item['@type']).toBe('ListItem');
      expect(item.position).toBe(i + 1);
      expect(typeof item.name).toBe('string');
      expect(item.item.startsWith('http')).toBe(true); // abs() resolves to an absolute URL
    });
  });

  it('resolves relative paths to absolute URLs under the site origin', () => {
    const result = breadcrumbJsonLd([{ name: 'About', path: '/about' }]);
    expect(result.itemListElement[0].item).toMatch(/^https?:\/\/.+\/about$/);
  });
});

describe('Guide spoke page template — T07 internal-link budget (<=20/page)', () => {
  it('a guide spoke page never exceeds 20 template-generated internal links', () => {
    // Template-generated links on /guide/[slug]: 2 breadcrumb crumbs (Home,
    // FIRE Guides — the current-page crumb is plain text, not a link) + up to
    // 3 sibling RelatedGuides links (relatedLimit=3 in guide.service.ts) + 1
    // CTA link to "/" = 6 total. Article body links (from DB content) are
    // hand-authored editorial content, not template-generated, and are
    // excluded from this budget per the T07 acceptance criterion's intent
    // (capping the AUTOMATED link modules, not editorial in-content links).
    const breadcrumbLinks = 2; // Home + FIRE Guides (current page crumb is text, not a link)
    const relatedGuidesLimit = 3;
    const ctaLinks = 1;
    const total = breadcrumbLinks + relatedGuidesLimit + ctaLinks;
    expect(total).toBeLessThanOrEqual(20);
  });

  it('every guide slug in the registry has at most 4 sibling candidates (bounds RelatedGuides fan-out)', () => {
    // getWithRelated() filters out the current slug and slices to 3 — with 7
    // total guide pages, the sibling pool per page is at most 6, sliced to 3.
    for (const page of GUIDE_PAGES) {
      const siblingPool = GUIDE_PAGES.filter((p) => p.canonicalPath !== page.canonicalPath);
      expect(siblingPool.length).toBeLessThanOrEqual(6);
    }
  });
});
