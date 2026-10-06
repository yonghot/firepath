/**
 * code-02-schema.test.ts — 부속P CODE-02 acceptance-criteria regression guard.
 *
 * "Rich Results Test / schema validator on a sample page shows valid Article
 * + BreadcrumbList + SoftwareApplication (and WebSite on root), and shows NO
 * FAQPage/HowTo emitted for SERP. ... aggregateRating absent unless backed by
 * real data." The WebSite node carries no SearchAction: the site has no
 * search endpoint (/guide ignores `q`), so advertising one would be false.
 *
 * Source-level checks (no jsdom in this repo's vitest environment).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calculatorAppJsonLd, breadcrumbJsonLd, organizationJsonLd } from '@/components/common/json-ld';

const ROOT = path.resolve(__dirname, '../../..');

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('부속P CODE-02 — root layout emits WebSite without a SearchAction', () => {
  it('layout.tsx defines a WebSite @type and no potentialAction SearchAction', () => {
    const source = readSource('src/app/layout.tsx');
    expect(source).toMatch(/@type['"]?:\s*['"]WebSite['"]/);
    expect(source).not.toContain('SearchAction');
    expect(source).not.toContain('potentialAction');
  });

  it('layout.tsx does not emit FAQPage or HowTo', () => {
    const source = readSource('src/app/layout.tsx');
    expect(source).not.toMatch(/['"]FAQPage['"]/);
    expect(source).not.toMatch(/['"]HowTo['"]/);
  });
});

describe('부속P CODE-02 — SoftwareApplication never fabricates aggregateRating', () => {
  it('calculatorAppJsonLd has no aggregateRating field', () => {
    const result = calculatorAppJsonLd();
    expect(result).not.toHaveProperty('aggregateRating');
  });

  it('json-ld.ts source contains no aggregateRating field construction (comments documenting its absence are fine)', () => {
    const source = readSource('src/components/common/json-ld.ts');
    // Only fail on an actual object-key construction (e.g. `aggregateRating:`),
    // not on comment prose that documents the "no aggregateRating" policy.
    expect(source).not.toMatch(/aggregateRating\s*:/);
  });
});

describe('부속P CODE-02 — BreadcrumbList wired via the shared Breadcrumbs component', () => {
  it('breadcrumbJsonLd produces a valid BreadcrumbList shape', () => {
    const result = breadcrumbJsonLd([{ name: 'Home', path: '/' }, { name: 'FIRE Types', path: '/fire-types' }]);
    expect(result['@type']).toBe('BreadcrumbList');
    expect(result.itemListElement.length).toBe(2);
    expect(result.itemListElement[0].position).toBe(1);
  });

  it('/fire-types and /healthcare-bridge both render <Breadcrumbs>', () => {
    for (const p of ['src/app/(main)/fire-types/page.tsx', 'src/app/(main)/healthcare-bridge/page.tsx']) {
      const source = readSource(p);
      expect(source).toMatch(/<Breadcrumbs\s/);
    }
  });
});

describe('부속P CODE-02 — Organization identity has no fabricated rating/review', () => {
  it('organizationJsonLd has no aggregateRating/review field', () => {
    const result = organizationJsonLd();
    expect(result).not.toHaveProperty('aggregateRating');
    expect(result).not.toHaveProperty('review');
  });
});
