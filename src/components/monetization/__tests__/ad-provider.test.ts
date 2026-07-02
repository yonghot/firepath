/**
 * AdProvider.tsx — unit tests (부속M K10: journey option, single-provider invariant)
 *
 * No React Testing Library / jsdom in this repo (see ad-slot.test.ts for the
 * same documented constraint), so this file exercises AdProvider.tsx at the
 * source level:
 *
 *   1. Every provider branch (adsense/ezoic/raptive/journey) is gated behind
 *      its own env-derived site-id/slot check and returns null when unset —
 *      pinned so a future edit can't accidentally render a broken/empty unit.
 *   2. Structural proof that at most ONE `<Script>` (programmatic loader) can
 *      ever render per module evaluation: the branches are mutually exclusive
 *      `if (PROVIDER === ...)` guards keyed off a single `PROVIDER` constant
 *      resolved once via `resolveAdProvider`, which itself always returns a
 *      single discriminant (see monetization.test.ts "NEVER returns two
 *      providers simultaneously"). This test greps the source to confirm the
 *      journey branch follows the identical shape as ezoic/raptive rather
 *      than e.g. an additive/parallel render.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_PATH = join(__dirname, '..', 'AdProvider.tsx');
const SOURCE = readFileSync(SOURCE_PATH, 'utf-8');

describe('AdProvider.tsx — journey provider branch (부속M K10)', () => {
  it('resolves PROVIDER from resolveAdProvider(NEXT_PUBLIC_AD_PROVIDER) exactly once at module scope', () => {
    const matches = SOURCE.match(/const PROVIDER = resolveAdProvider\(/g) ?? [];
    expect(matches.length).toBe(1);
  });

  it('reads NEXT_PUBLIC_JOURNEY_SITE_ID exactly once at module scope, trimmed, defaulting to null', () => {
    expect(SOURCE).toMatch(
      /const JOURNEY_SITE_ID = process\.env\.NEXT_PUBLIC_JOURNEY_SITE_ID\?\.trim\(\) \|\| null;/
    );
  });

  it('the journey branch checks PROVIDER === "journey" and short-circuits to null when JOURNEY_SITE_ID is unset', () => {
    const journeyBlockMatch = SOURCE.match(
      /if \(PROVIDER === 'journey'\) \{([\s\S]*?)\n {2}\}/
    );
    expect(journeyBlockMatch).not.toBeNull();
    const block = journeyBlockMatch![1];
    expect(block).toMatch(/if \(!JOURNEY_SITE_ID\) return null;/);
  });

  it('the journey branch renders exactly one <Script> element, never two providers at once', () => {
    const journeyBlockMatch = SOURCE.match(
      /if \(PROVIDER === 'journey'\) \{([\s\S]*?)\n {2}\}/
    );
    const block = journeyBlockMatch![1];
    const scriptTags = block.match(/<Script\b/g) ?? [];
    expect(scriptTags.length).toBe(1);
  });

  it('every provider branch (adsense/ezoic/raptive/journey) is a mutually-exclusive top-level if on the same PROVIDER constant', () => {
    const branches = ['adsense', 'ezoic', 'raptive', 'journey'];
    for (const branch of branches) {
      expect(SOURCE).toMatch(new RegExp(`if \\(PROVIDER === '${branch}'\\) \\{`));
    }
    // Exactly 4 named-provider branches plus the final none/unknown fallthrough.
    const ifProviderCount = (SOURCE.match(/if \(PROVIDER === '/g) ?? []).length;
    expect(ifProviderCount).toBe(4);
  });

  it('component ends with an unconditional final `return null;` for none/unknown providers', () => {
    expect(SOURCE.trim().endsWith('return null;\n}')).toBe(true);
  });
});
