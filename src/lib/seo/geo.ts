/**
 * lib/seo/geo.ts — GEO (Generative Engine Optimization) answer-block builder.
 *
 * 부속P CODE-01. Produces the data shape for a passage-level "answer block"
 * that AnswerBlock (src/components/common/answer-block.tsx) renders as the
 * FIRST server-rendered content block on every entity/calculator page
 * (/fire-types, /healthcare-bridge, the /guide hub) and inside the embed
 * pages that surface the same calculators.
 *
 * 부속P §0 correction #1 — the GEO citation-lift percentages in the
 * originating deep-research doc are directional, not measured referral
 * traffic; this module does not claim or log any lift number. It only
 * builds the structurally-correct block (query-phrased H2, 40-60 word
 * answer paragraph with real computed figures, compact data table, cost/
 * factor list, >=2 source-attributed stats, dated freshness marker) that
 * the underlying research treats as "content table-stakes" for AI-answer
 * extraction and classic featured-snippet capture.
 *
 * FIREPath is NOT a YMYL cost-by-location calculator (see repo reality in
 * the task brief) — its entities are FIRE-type targets and the healthcare
 * bridge estimate, both driven by src/lib/engine/* + src/lib/figures.ts.
 * Every number in a GeoAnswerEntity MUST originate from those engines /
 * figures.ts — this module never fabricates a value; it only shapes
 * already-computed numbers into the required passage structure.
 *
 * Tone: neutral, no superlatives (부속P §4 CODE-01 acceptance — "no
 * promotional/superlative tone"). Do not add words like "amazing",
 * "best", "guaranteed", etc. to any copy built from this module.
 */

/** One row of the compact cost/data-breakdown table (3-4 cols x 5-10 rows). */
export interface GeoTableRow {
  /** First column — the row's label (e.g. FIRE type name, line item). */
  label: string;
  /** Remaining columns, already formatted for display (currency/percent/etc). */
  values: string[];
}

/** One inline, source-attributed statistic embedded in the answer paragraph area. */
export interface GeoStat {
  /** The stat itself, already formatted (e.g. "4% Safe Withdrawal Rate"). */
  text: string;
  /** Short inline attribution, e.g. "Trinity Study (1998)" or "NYU Stern historical data". */
  sourceLabel: string;
  /** Optional URL for the attribution (rendered as a link when present). */
  sourceUrl?: string;
}

export interface GeoAnswerEntity {
  /** Query-phrased H2, e.g. "How much do you need to retire early with Coast FIRE?" */
  query: string;
  /**
   * 40-60 word answer paragraph. Must already contain the real computed
   * number(s) and the literal string "As of {dataVerifiedDate}" (or an
   * equivalent dated freshness phrase) — this module does not template it
   * further so callers keep full control of word count and phrasing.
   */
  answer: string;
  /** ISO date (YYYY-MM-DD) the underlying figures were last verified. */
  dataVerifiedDate: string;
  /** Table column headers (3-4 cols). First header is the label column. */
  tableHeaders: string[];
  /** Table body rows (5-10 rows). */
  tableRows: GeoTableRow[];
  /** 5-10 cost/factor bullet items. */
  factors: string[];
  /** >=2 inline source-attributed stats. */
  stats: GeoStat[];
}

/** Validates the acceptance-criteria shape in non-production builds (dev-time signal only). */
export function validateGeoAnswerEntity(entity: GeoAnswerEntity): {
  wordCountOk: boolean;
  wordCount: number;
  tableRowsOk: boolean;
  tableColsOk: boolean;
  factorsOk: boolean;
  statsOk: boolean;
  hasFreshnessMarker: boolean;
} {
  const wordCount = entity.answer.trim().split(/\s+/).filter(Boolean).length;
  return {
    wordCountOk: wordCount >= 40 && wordCount <= 60,
    wordCount,
    tableRowsOk: entity.tableRows.length >= 5 && entity.tableRows.length <= 10,
    tableColsOk: entity.tableHeaders.length >= 3 && entity.tableHeaders.length <= 4,
    factorsOk: entity.factors.length >= 5 && entity.factors.length <= 10,
    statsOk: entity.stats.length >= 2,
    hasFreshnessMarker:
      entity.answer.includes(entity.dataVerifiedDate) ||
      /as of|data verified/i.test(entity.answer),
  };
}

/**
 * buildAnswerBlock(entity) — pass-through shaping function.
 *
 * Kept as a named export (rather than inlining entity objects directly into
 * AnswerBlock's props) so every call site goes through one typed seam, and
 * so a future per-vertical config layer (query template + field list, per
 * 부속P §3 "10개 동일" principle) has a single function signature to target.
 * Currently a structural identity function — validation happens via
 * validateGeoAnswerEntity, kept separate so it never throws in prod.
 */
export function buildAnswerBlock(entity: GeoAnswerEntity): GeoAnswerEntity {
  return entity;
}
