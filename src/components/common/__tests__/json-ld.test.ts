/**
 * json-ld.ts — unit tests
 *
 * Identity nodes (Organization, author/publisher/creator) all resolve to the
 * publisher slot in src/lib/site.ts; no Person or reviewer claims exist
 * (K30). dateModified is present on calculator pages. No React rendering
 * (see breadcrumbs.test.ts comment — this repo's vitest runs in plain
 * `node`, no jsdom) — these tests exercise the JSON-LD builder functions
 * directly.
 */

import { describe, it, expect } from 'vitest';
import * as jsonLd from '@/components/common/json-ld';
import { PUBLISHER } from '@/lib/site';
import {
  organizationJsonLd,
  calculatorAppJsonLd,
  fireStatisticsDatasetJsonLd,
} from '@/components/common/json-ld';
import { CORE_ASSUMPTIONS_LAST_VERIFIED, getFiguresLastUpdated } from '@/lib/figures';

describe('no Person identity exists', () => {
  it('the module exports no personJsonLd builder', () => {
    expect(jsonLd).not.toHaveProperty('personJsonLd');
  });
});

describe('organizationJsonLd — sitewide identity is the publisher', () => {
  it('produces an Organization for the publisher and no invented facts', () => {
    const result = organizationJsonLd();
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('Organization');
    expect(result.name).toBe(PUBLISHER.name);
    expect(result.url).toBe(PUBLISHER.url);
    expect(result.email).toBe(PUBLISHER.email);
    expect(Object.keys(result).sort()).toEqual(['@context', '@type', 'email', 'name', 'url']);
  });
});

describe('calculatorAppJsonLd — dateModified + publisher linkage', () => {
  it('resolves author and publisher to the publisher Organization', () => {
    const result = calculatorAppJsonLd();
    for (const node of [result.author, result.publisher]) {
      expect(node).toEqual({ '@type': 'Organization', name: PUBLISHER.name, url: PUBLISHER.url });
    }
  });

  it('omits dateModified when not provided (never a fabricated freshness stamp by default)', () => {
    const result = calculatorAppJsonLd();
    expect(result).not.toHaveProperty('dateModified');
  });

  it('sets dateModified to the exact value passed in — the SAME field the "Updated for {year}" badge reads', () => {
    const lastVerified = getFiguresLastUpdated();
    const result = calculatorAppJsonLd({ dateModified: lastVerified });
    expect(result.dateModified).toBe(lastVerified);
    // Never a hand-typed date drifting from the real figures registry.
    expect(result.dateModified).toBe(CORE_ASSUMPTIONS_LAST_VERIFIED);
  });
});

describe('fireStatisticsDatasetJsonLd — 부속P CODE-04 Dataset schema', () => {
  const result = fireStatisticsDatasetJsonLd({
    dateModified: CORE_ASSUMPTIONS_LAST_VERIFIED,
    description: 'Test description',
  });

  it('emits a valid schema.org Dataset', () => {
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('Dataset');
    expect(result.name).toBeTruthy();
    expect(result.description).toBe('Test description');
  });

  it('sets dateModified to the exact value passed in — never a fabricated freshness stamp', () => {
    expect(result.dateModified).toBe(CORE_ASSUMPTIONS_LAST_VERIFIED);
  });

  it('declares a DataDownload distribution for both /data.json and /data.csv', () => {
    expect(result.distribution).toHaveLength(2);
    const formats = result.distribution.map((d) => d.encodingFormat).sort();
    expect(formats).toEqual(['application/json', 'text/csv']);
    for (const d of result.distribution) {
      expect(d['@type']).toBe('DataDownload');
      expect(typeof d.contentUrl).toBe('string');
      expect(d.contentUrl).toMatch(/\/data\.(json|csv)$/);
    }
  });

  it('has no aggregateRating/review fields (never fabricated)', () => {
    expect(result).not.toHaveProperty('aggregateRating');
    expect(result).not.toHaveProperty('review');
  });

  it('credits the publisher as creator', () => {
    expect(result.creator).toEqual({ '@type': 'Organization', name: PUBLISHER.name, url: PUBLISHER.url });
  });
});
