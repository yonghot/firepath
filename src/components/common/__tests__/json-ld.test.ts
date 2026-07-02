/**
 * json-ld.ts — unit tests (부속I T11 E-E-A-T acceptance criteria)
 *
 * "JSON-LD validates (Organization, Person, dateModified present on
 * calculator pages)". No React rendering (see breadcrumbs.test.ts comment —
 * this repo's vitest runs in plain `node`, no jsdom) — these tests exercise
 * the JSON-LD builder functions directly.
 */

import { describe, it, expect } from 'vitest';
import { personJsonLd, organizationJsonLd, calculatorAppJsonLd } from '@/components/common/json-ld';
import { CORE_ASSUMPTIONS_LAST_VERIFIED, getFiguresLastUpdated } from '@/lib/figures';

describe('personJsonLd — T11 E-E-A-T Person identity', () => {
  it('produces a Person schema linked to the Organization, with NO fabricated name/credentials', () => {
    const result = personJsonLd();
    expect(result['@context']).toBe('https://schema.org');
    expect(result['@type']).toBe('Person');
    // Honest generic identity — matches AuthorByline's "FIREPath Editorial Team".
    expect(result.name).toBe('FIREPath Editorial Team');
    expect(result.worksFor['@type']).toBe('Organization');
    expect(result.worksFor.name).toBe('FIREPath');
    // No invented credential/license fields exist on this object at all.
    expect(result).not.toHaveProperty('honorificPrefix');
    expect(result).not.toHaveProperty('jobTitle');
    expect(result).not.toHaveProperty('alumniOf');
  });
});

describe('organizationJsonLd — sitewide identity', () => {
  it('produces a valid Organization schema', () => {
    const result = organizationJsonLd();
    expect(result['@type']).toBe('Organization');
    expect(result.name).toBe('FIREPath');
    expect(typeof result.url).toBe('string');
  });
});

describe('calculatorAppJsonLd — T11 dateModified + Person/Organization linkage', () => {
  it('includes author (Person) and publisher (Organization) fields', () => {
    const result = calculatorAppJsonLd();
    expect(result.author['@type']).toBe('Person');
    expect(result.author.name).toBe('FIREPath Editorial Team');
    expect(result.publisher['@type']).toBe('Organization');
    expect(result.publisher.name).toBe('FIREPath');
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
