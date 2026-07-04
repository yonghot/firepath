/**
 * geo.ts — unit tests (부속P CODE-01 acceptance criteria)
 *
 * "View-source of any of the [entity/calculator] page types shows:
 * query-phrased H2, a 40-60 word answer paragraph containing the computed
 * numbers, a data <table>, a factor <ul>, >=2 inline source-attributed
 * stats, and a dated freshness marker."
 *
 * These tests exercise buildAnswerBlock()/validateGeoAnswerEntity() plus
 * the actual per-page GeoAnswerEntity objects (fire-types, healthcare-bridge,
 * guide hub, main calculator) so a future edit that breaks the 40-60 word
 * band, table shape, or stat count fails CI instead of silently regressing.
 */

import { describe, it, expect } from 'vitest';
import { buildAnswerBlock, validateGeoAnswerEntity, type GeoAnswerEntity } from '@/lib/seo/geo';
import { MAIN_CALCULATOR_ANSWER } from '@/lib/seo/geo-entities';

const VALID_ENTITY: GeoAnswerEntity = {
  query: 'How much do you need to retire early with Example FIRE?',
  answer:
    'At the common defaults (age 30, $40,000/yr expenses, 4.0% SWR), Example FIRE needs ' +
    '$600,000 today, compounding to the full target by retirement age. As of 2026-06-29, this ' +
    'figure comes directly from the FIREPath calculation engine, not a hand-typed or fabricated estimate.',
  dataVerifiedDate: '2026-06-29',
  tableHeaders: ['Type', 'Multiplier', 'Target', 'Monthly'],
  tableRows: [
    { label: 'Lean', values: ['60%', '$600K', '$2,000/mo'] },
    { label: 'Regular', values: ['100%', '$1.0M', '$3,333/mo'] },
    { label: 'Fat', values: ['150%', '$1.5M', '$5,000/mo'] },
    { label: 'Coast', values: ['n/a', '$304K', '$3,333/mo'] },
    { label: 'Barista', values: ['50%', '$500K', '$1,667/mo'] },
  ],
  factors: [
    'Annual expenses',
    'Safe withdrawal rate',
    'Expected return',
    'Inflation',
    'Current age',
    'Retirement age',
  ],
  stats: [
    { text: '4% SWR', sourceLabel: 'Trinity Study', sourceUrl: 'https://en.wikipedia.org/wiki/Trinity_study' },
    { text: '7% return', sourceLabel: 'NYU Stern data' },
  ],
};

describe('buildAnswerBlock — pass-through shaping', () => {
  it('returns the entity unchanged (typed seam, no mutation)', () => {
    const result = buildAnswerBlock(VALID_ENTITY);
    expect(result).toEqual(VALID_ENTITY);
  });
});

describe('validateGeoAnswerEntity — CODE-01 acceptance-criteria shape', () => {
  it('passes every check for a well-formed entity', () => {
    const v = validateGeoAnswerEntity(VALID_ENTITY);
    expect(v.wordCountOk).toBe(true);
    expect(v.wordCount).toBeGreaterThanOrEqual(40);
    expect(v.wordCount).toBeLessThanOrEqual(60);
    expect(v.tableRowsOk).toBe(true);
    expect(v.tableColsOk).toBe(true);
    expect(v.factorsOk).toBe(true);
    expect(v.statsOk).toBe(true);
    expect(v.hasFreshnessMarker).toBe(true);
  });

  it('flags a too-short answer paragraph', () => {
    const v = validateGeoAnswerEntity({ ...VALID_ENTITY, answer: 'Too short.' });
    expect(v.wordCountOk).toBe(false);
  });

  it('flags fewer than 2 stats', () => {
    const v = validateGeoAnswerEntity({ ...VALID_ENTITY, stats: [VALID_ENTITY.stats[0]] });
    expect(v.statsOk).toBe(false);
  });

  it('flags a table outside the 5-10 row band', () => {
    const v = validateGeoAnswerEntity({ ...VALID_ENTITY, tableRows: VALID_ENTITY.tableRows.slice(0, 2) });
    expect(v.tableRowsOk).toBe(false);
  });

  it('flags a factor list outside the 5-10 item band', () => {
    const v = validateGeoAnswerEntity({ ...VALID_ENTITY, factors: ['one', 'two'] });
    expect(v.factorsOk).toBe(false);
  });

  it('flags a missing freshness marker', () => {
    const v = validateGeoAnswerEntity({
      ...VALID_ENTITY,
      answer: 'A generic answer paragraph with no dated freshness phrase anywhere in its text at all here now.',
    });
    expect(v.hasFreshnessMarker).toBe(false);
  });
});

describe('MAIN_CALCULATOR_ANSWER — real per-page entity (shared home + embed)', () => {
  it('satisfies the full CODE-01 acceptance-criteria shape', () => {
    const v = validateGeoAnswerEntity(MAIN_CALCULATOR_ANSWER);
    expect(v.wordCountOk).toBe(true);
    expect(v.tableRowsOk).toBe(true);
    expect(v.tableColsOk).toBe(true);
    expect(v.factorsOk).toBe(true);
    expect(v.statsOk).toBe(true);
    expect(v.hasFreshnessMarker).toBe(true);
  });

  it('every stat carries a non-empty source attribution', () => {
    for (const stat of MAIN_CALCULATOR_ANSWER.stats) {
      expect(stat.sourceLabel.length).toBeGreaterThan(0);
    }
  });

  it('every table row has one value per header column', () => {
    const dataCols = MAIN_CALCULATOR_ANSWER.tableHeaders.length - 1;
    for (const row of MAIN_CALCULATOR_ANSWER.tableRows) {
      expect(row.values.length).toBe(dataCols);
    }
  });

  it('uses no superlative/promotional language (neutral tone requirement)', () => {
    const banned = /\b(amazing|best|guaranteed|incredible|unbeatable|revolutionary)\b/i;
    expect(banned.test(MAIN_CALCULATOR_ANSWER.answer)).toBe(false);
  });
});
