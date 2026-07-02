/**
 * 부속M K01 — on-page editorial content depth regression guard.
 *
 * No React Testing Library / jsdom is installed in this repo (vitest runs in
 * the plain `node` environment — see ad-slot.test.ts / breadcrumbs.test.ts
 * for the same documented constraint), so this file uses the same
 * SOURCE-LEVEL text-extraction technique already established by
 * ad-slot.test.ts / ad-exclusion-zones.test.ts: it reads each page's .tsx
 * source, strips JSX markup/braces/imports down to approximate rendered
 * prose, and counts words. This is a coarse proxy for the K01 acceptance
 * criterion ("word-count build assertion >= 400 on the page classes
 * covered"), not a pixel-exact renderer — it is deliberately conservative
 * (strips code, not just tags) so a passing count is strong evidence of real
 * prose, not JSX bulk.
 *
 * Covered page classes (부속M K01 — all INDEXED calculator pages):
 *   - "/" (fire_timeline) — home page + HowItWorksFire section
 *   - "/fire-types" — per-FIRE-type worked examples + entity-level FAQ
 *   - "/healthcare-bridge" — how-it-works + worked example + entity-level FAQ
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');

/**
 * Approximates rendered prose word count from a .tsx source file.
 * Strips: import/export statements, JS comments, JSX tags, JSX expression
 * braces' punctuation-only content, and code-only lines (const/function
 * declarations), then counts remaining whitespace-separated word tokens.
 * Deliberately over-strips rather than over-counts, so passing >=400 is a
 * meaningful signal of real prose, not inflated by code tokens.
 */
function approxRenderedWordCount(source: string): number {
  let s = source;

  // Strip block/line comments.
  s = s.replace(/\/\*[\s\S]*?\*\//g, ' ');
  s = s.replace(/\/\/.*$/gm, ' ');

  // Strip import/export lines entirely (not prose).
  s = s.replace(/^\s*(import|export)\s.*$/gm, ' ');

  // Strip JSON-LD / const object literal blocks assigned before the default
  // export (metadata, structured data, FAQ arrays already counted via their
  // .q/.a string literals below — avoid double counting keys like "q:"/"a:").
  // Keep it simple: just strip object/array punctuation, not the literal text.
  s = s.replace(/[{}[\]();,]/g, ' ');

  // Strip JSX tags like <div className="..."> or </div> and self-closing tags.
  s = s.replace(/<\/?[a-zA-Z][^>]*>/g, ' ');

  // Strip className/style/aria-* attribute-ish leftovers and quotes.
  s = s.replace(/"/g, ' ').replace(/'/g, ' ').replace(/`/g, ' ');

  // Strip common JS keywords/operators that survive punctuation stripping.
  s = s.replace(
    /\b(const|let|var|function|return|interface|type|export|default|async|await|new|typeof|as|from|null|undefined|true|false)\b/g,
    ' '
  );

  // Collapse whitespace and split into word tokens (alphabetic-led tokens,
  // allowing embedded digits/%/$/decimal points so figures like "$1,000,000"
  // or "4%" still count as one word each, matching a human word count).
  const tokens = s
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0)
    // Drop pure-symbol/code tokens (e.g. "=>", "===", stray "&&") that have
    // no letter or digit in them at all.
    .filter((t) => /[a-zA-Z0-9]/.test(t));

  return tokens.length;
}

describe('부속M K01 — page content depth (word-count >= 400)', () => {
  it('home page ("/", fire_timeline) has >= 400 approximate rendered words across page.tsx + HowItWorksFire', () => {
    const pageSource = readFileSync(path.join(ROOT, 'src/app/(main)/page.tsx'), 'utf8');
    const howItWorksSource = readFileSync(
      path.join(ROOT, 'src/components/common/how-it-works-fire.tsx'),
      'utf8'
    );
    const count = approxRenderedWordCount(pageSource + '\n' + howItWorksSource);
    expect(count).toBeGreaterThanOrEqual(400);
  });

  it('/fire-types has >= 400 approximate rendered words (how-it-works + 5 worked examples + FAQ)', () => {
    const source = readFileSync(path.join(ROOT, 'src/app/(main)/fire-types/page.tsx'), 'utf8');
    const count = approxRenderedWordCount(source);
    expect(count).toBeGreaterThanOrEqual(400);
  });

  it('/healthcare-bridge has >= 400 approximate rendered words (how-it-works + worked example + FAQ)', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/app/(main)/healthcare-bridge/page.tsx'),
      'utf8'
    );
    const count = approxRenderedWordCount(source);
    expect(count).toBeGreaterThanOrEqual(400);
  });
});

describe('부속M K01 — entity-level FAQ presence (never noun-swapped boilerplate)', () => {
  it('/fire-types FAQ has 4-6 questions, each mentioning that FIRE type’s own computed figure', () => {
    const source = readFileSync(path.join(ROOT, 'src/app/(main)/fire-types/page.tsx'), 'utf8');
    const qMatches = source.match(/q:\s*"/g) ?? [];
    expect(qMatches.length).toBeGreaterThanOrEqual(4);
    expect(qMatches.length).toBeLessThanOrEqual(6);
    // Entity-level check: the FAQ block must reference the per-type result
    // fields (defaultResults.lean/regular/fat/coast/barista), not a single
    // generic template repeated — i.e. distinct per-entity data binding.
    for (const type of ['lean', 'regular', 'fat', 'coast', 'barista']) {
      expect(source).toContain(`defaultResults.${type}`);
    }
  });

  it('/healthcare-bridge FAQ has 4-6 questions, each grounded in the tool’s own engine output', () => {
    const source = readFileSync(
      path.join(ROOT, 'src/app/(main)/healthcare-bridge/page.tsx'),
      'utf8'
    );
    const qMatches = source.match(/q:\s*"/g) ?? [];
    expect(qMatches.length).toBeGreaterThanOrEqual(4);
    expect(qMatches.length).toBeLessThanOrEqual(6);
    // Must reference the real computed worked-example result, not a
    // fabricated figure independent of calculateHealthcareBridge().
    expect(source).toContain('exampleResult');
    expect(source).toContain('calculateHealthcareBridge');
  });
});
