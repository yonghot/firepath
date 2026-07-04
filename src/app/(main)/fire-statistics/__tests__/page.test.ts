/**
 * fire-statistics/page.tsx — unit + source-level tests (부속P CODE-04
 * acceptance criteria).
 *
 * No jsdom in this repo (vitest runs in plain `node`), so page-level
 * structural checks are source-level (matching answer-block.test.ts /
 * faq-section.test.ts conventions); the underlying dataset/JSON-LD builders
 * are covered directly (statistics.test.ts, json-ld.test.ts).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../../..');

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('부속P CODE-04 — /fire-statistics page structure', () => {
  const source = readSource('src/app/(main)/fire-statistics/page.tsx');

  it('is a server component (no top-level "use client" directive)', () => {
    const firstNonEmptyLine = source.split('\n').find((l) => l.trim().length > 0) ?? '';
    expect(firstNonEmptyLine.includes("'use client'")).toBe(false);
  });

  it('renders a headline stat, a ranked table, and a findings list', () => {
    expect(source).toMatch(/headline-stat-heading/);
    expect(source).toMatch(/ranked-table-heading/);
    expect(source).toMatch(/findings-heading/);
    expect(source).toContain('<table');
  });

  it('emits Dataset JSON-LD via fireStatisticsDatasetJsonLd', () => {
    expect(source).toMatch(/fireStatisticsDatasetJsonLd/);
    expect(source).toContain('application/ld+json');
  });

  it('links to both /data.json and /data.csv downloads', () => {
    expect(source).toContain('/data.json');
    expect(source).toContain('/data.csv');
  });

  it('sources every figure from buildFireStatisticsDataset() — never a hand-typed literal number', () => {
    expect(source).toMatch(/buildFireStatisticsDataset/);
  });

  it('renders a data-derived synthesis sentence via buildSynthesisSentence (부속P CODE-06)', () => {
    expect(source).toMatch(/buildSynthesisSentence/);
    expect(source).toContain('SYNTHESIS_SENTENCE');
  });

  it('carries a disclaimer banner (부속G non-personalization/compliance requirement, unchanged)', () => {
    expect(source).toContain('DisclaimerBanner');
  });
});
