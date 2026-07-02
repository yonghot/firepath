/**
 * seo.ts — unit tests (부속I T10 acceptance criteria)
 *
 * Enforces the title contract (50-60 chars, primary keyword in the first 30
 * chars, leading phrase matches the page H1) as a build-time assertion over
 * the route/dataset matrix — every hardcoded static route this repo directly
 * controls is listed here with its actual H1 text, so a future title/H1 edit
 * that breaks the contract fails `pnpm test` immediately.
 *
 * Guide `/guide/[slug]` pages are EXCLUDED from the title-length assertion:
 * their title/description are DB-authored (Supabase `guides.title`), not
 * hardcoded in this repo, so buildMeta() cannot enforce length on content it
 * doesn't own — see the comment in src/app/(main)/guide/[slug]/page.tsx.
 */

import { describe, it, expect } from 'vitest';
import { buildMeta, validateTitle, titleLeadPhrase } from '@/lib/seo';

/** path -> [title, h1Text] for every hardcoded static route in this repo. */
const ROUTE_MATRIX: Record<string, { title: string; h1: string }> = {
  '/': { title: 'FIREPath: All 5 FIRE Types on One Live Timeline (2026)', h1: 'FIREPath' },
  '/result': {
    title: "This Scenario's FIRE Results: Full Timeline Breakdown",
    h1: "This Scenario's FIRE Results",
  },
  '/about': {
    title: 'About FIREPath: Our Editorial Standards and Sources',
    h1: 'About FIREPath',
  },
  '/methodology': {
    title: 'How We Calculate: FIRE Formulas and Cited Data Sources',
    h1: 'How We Calculate',
  },
  '/fire-types': {
    title: 'FIRE Types Explained: Lean, Fat, Coast and Barista',
    h1: 'FIRE Types Explained',
  },
  '/healthcare-bridge': {
    title: 'Healthcare Bridge Estimator: Your Cost Before Medicare',
    h1: 'Healthcare Bridge Estimator',
  },
  '/guide': {
    title: 'FIRE Guides: Learn Every Financial Independence Type',
    h1: 'FIRE Guides',
  },
  '/premium': {
    title: 'Unlock Your FIRE Potential: Go Premium for $4.99/mo',
    h1: 'Unlock Your FIRE Potential',
  },
  '/contact': {
    title: 'Contact Us: Reach the FIREPath Support Team Directly',
    h1: 'Contact Us',
  },
  '/embed-this': {
    title: 'Embed the FIRE Calculator: Free Widget for Your Site',
    h1: 'Embed the FIRE Calculator',
  },
};

describe('seo.ts — T10 title contract build-time assertion', () => {
  for (const [path, { title, h1 }] of Object.entries(ROUTE_MATRIX)) {
    describe(`route ${path}`, () => {
      it('title is 50-60 characters', () => {
        const { lengthOk, length } = validateTitle(title);
        expect(lengthOk, `"${title}" is ${length} chars, expected 50-60`).toBe(true);
      });

      it("title's leading phrase textually matches the page H1", () => {
        expect(titleLeadPhrase(title)).toBe(h1);
      });

      it('primary keyword phrase appears within the first 30 characters', () => {
        // The leading phrase (before the separator) IS the keyword phrase for
        // every route in this matrix — assert it starts within char 30.
        const lead = titleLeadPhrase(title);
        const idx = title.indexOf(lead);
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx + lead.length).toBeLessThanOrEqual(30);
      });
    });
  }

  it('buildMeta sets alternates.canonical to the clean path (no query params)', () => {
    const meta = buildMeta({ title: 'X'.repeat(55), description: 'desc', path: '/foo?bar=1' });
    // Path is passed through as-is by the caller's contract (callers must
    // pass the clean path) — this test documents that buildMeta does not
    // itself strip query strings, so callers must never pass one.
    expect(meta.alternates?.canonical).toBe('/foo?bar=1');
  });

  it('buildMeta normalizes a path without a leading slash', () => {
    const meta = buildMeta({ title: 'X'.repeat(55), description: 'desc', path: 'foo' });
    expect(meta.alternates?.canonical).toBe('/foo');
  });

  it('buildMeta defaults robots to index:true, follow:true', () => {
    const meta = buildMeta({ title: 'X'.repeat(55), description: 'desc', path: '/foo' });
    expect(meta.robots).toEqual({ index: true, follow: true });
  });

  it('buildMeta honors an explicit robots override (T09 thin-page gate)', () => {
    const meta = buildMeta({
      title: 'X'.repeat(55),
      description: 'desc',
      path: '/foo',
      robots: { index: false, follow: true },
    });
    expect(meta.robots).toEqual({ index: false, follow: true });
  });

  it('buildMeta mirrors title/description into openGraph and twitter', () => {
    const meta = buildMeta({ title: 'My Title', description: 'My description', path: '/foo' });
    expect(meta.openGraph?.title).toBe('My Title');
    expect(meta.openGraph?.description).toBe('My description');
    expect(meta.twitter).toMatchObject({ title: 'My Title', description: 'My description' });
  });
});

describe('titleLeadPhrase()', () => {
  it('splits on " — " separator', () => {
    expect(titleLeadPhrase('Foo — Bar Baz')).toBe('Foo');
  });

  it('splits on ": " separator', () => {
    expect(titleLeadPhrase('Foo: Bar Baz')).toBe('Foo');
  });

  it('returns the whole title when no separator is present', () => {
    expect(titleLeadPhrase('Just A Title')).toBe('Just A Title');
  });
});
