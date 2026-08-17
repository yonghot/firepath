/**
 * ad-density.test.ts — CODE-06 (부속W §5) structural ad-density caps.
 *
 * The existing src/components/common/__tests__/ad-exclusion-zones.test.ts (K05)
 * guards accidental-click SPACING — where an ad may sit relative to the
 * calculator inputs. This suite guards the other half: HOW MANY units a route
 * may carry at all, which is the clause AdSense's publisher policy actually
 * enforces ("screens with more ads or other paid promotional material than
 * publisher-content").
 *
 * Enforced here, from the real route sources:
 *   1. No route declares more than AD_DENSITY_LIMITS.maxUnitsPerRoute units.
 *   2. At most one unit precedes the publisher content, by source order.
 *   3. No ad module reads navigator.userAgent or a user-agent request header.
 *      Branching what a visitor sees on user agent is cloaking (부속W §7
 *      anti-pattern 11); with one publisher id shared across ten domains it is
 *      an existential risk, so it is pinned by a test rather than a comment.
 *   4. The density math behaves (the limits are real, not decorative).
 *
 * Like the other source-inspection suites in this repo (ad-exclusion-zones,
 * t15-t16-wiring-audit), this reads files rather than rendering: vitest runs in
 * the default `node` environment here with no jsdom dependency, and the
 * ad-bearing routes are async server components that need request data.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  AD_DENSITY_LIMITS,
  AD_ENTRY_POINTS,
  countAdEntryPoints,
  evaluateAdDensity,
  reservedHeightPx,
  estimateContentHeightPx,
} from '@/lib/ad-density';

const ROOT = path.resolve(__dirname, '..', '..', '..');
const APP_DIR = path.join(ROOT, 'src', 'app');

/** Every App Router route entry file (page/layout) under src/app. */
function collectRouteFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === '__tests__') continue;
      collectRouteFiles(full, out);
    } else if (entry === 'page.tsx' || entry === 'layout.tsx') {
      out.push(full);
    }
  }
  return out;
}

const ROUTE_FILES = collectRouteFiles(APP_DIR);

/**
 * Markers for "publisher content starts here" in this repo's route sources.
 * Beyond plain headings, /result opens with <ResultClient /> (which renders the
 * result cards and their headings) and the home route leads with <h1> then
 * <CalculatorClient />, so those component mounts count as content starts too.
 */
const CONTENT_START =
  /<h1\b|<h2\b|<article\b|<ResultClient\b|<CalculatorClient\b|<AnswerBlock\b|<HowItWorksFire\b/;

function stripComments(source: string): string {
  return source
    .replace(/\{\s*\/\*[\s\S]*?\*\/\s*\}/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/^\s*\/\/.*$/gm, ' ');
}

describe('CODE-06 — ad density ceilings', () => {
  it('finds routes to audit (guards against the audit silently covering nothing)', () => {
    expect(ROUTE_FILES.length).toBeGreaterThan(0);
  });

  it.each(ROUTE_FILES.map((f) => [path.relative(ROOT, f), f] as const))(
    '%s declares no more ad units than the per-route cap',
    (label, file) => {
      const units = countAdEntryPoints(readFileSync(file, 'utf-8'));
      expect(units, `${label} declares ${units} ad entry points`).toBeLessThanOrEqual(
        AD_DENSITY_LIMITS.maxUnitsPerRoute
      );
    }
  );

  it('no route puts more than one ad unit ahead of where its content starts', () => {
    for (const file of ROUTE_FILES) {
      const source = stripComments(readFileSync(file, 'utf-8'));
      const contentAt = source.search(CONTENT_START);
      if (contentAt === -1) continue;
      const before = countAdEntryPoints(source.slice(0, contentAt));
      expect(
        before,
        `${path.relative(ROOT, file)} renders ${before} ad units before its content starts`
      ).toBeLessThanOrEqual(AD_DENSITY_LIMITS.maxUnitsBeforeContent);
    }
  });

  it('ad modules never branch on user agent (cloaking guard)', () => {
    const adSources = [
      'src/components/common/ad-slot.tsx',
      'src/components/monetization/AdProvider.tsx',
      'src/components/monetization/ResultMonetization.tsx',
      'src/lib/ad-slots.ts',
      'src/lib/monetization.ts',
      'src/lib/ad-density.ts',
    ];
    for (const rel of adSources) {
      // Prose explaining the rule is fine; reading the value is not.
      const code = stripComments(readFileSync(path.join(ROOT, rel), 'utf-8'));
      expect(code, `${rel} must not read navigator.userAgent`).not.toMatch(
        /navigator\s*\.\s*userAgent/
      );
      expect(code, `${rel} must not read a user-agent header`).not.toMatch(
        /headers\(\)[\s\S]{0,40}user-agent/i
      );
      expect(code, `${rel} must not read a user-agent header`).not.toMatch(
        /get\(\s*['"]user-agent['"]\s*\)/i
      );
    }
  });

  it('entry-point counting ignores comments that merely mention the components', () => {
    const source = `
      {/* K05: CalculatorClient must never mount <AdSlot /> itself */}
      // <AdProvider /> used to live here
      /* <ResultMonetization /> too */
      <DisplaySlot />
    `;
    expect(countAdEntryPoints(source)).toBe(1);
  });

  it('counts every entry-point name this repo uses', () => {
    const source = AD_ENTRY_POINTS.map((n) => `<${n} />`).join('\n');
    expect(countAdEntryPoints(source)).toBe(AD_ENTRY_POINTS.length);
  });

  describe('density math', () => {
    it('passes a long guide page carrying one unit', () => {
      const result = evaluateAdDensity({ unitFormats: ['auto'], contentWords: 1900 });
      expect(result.withinLimits).toBe(true);
      expect(result.violations).toEqual([]);
    });

    it('flags too many units', () => {
      const result = evaluateAdDensity({
        unitFormats: ['rectangle', 'rectangle', 'rectangle', 'leaderboard'],
        contentWords: 5000,
      });
      expect(result.withinLimits).toBe(false);
      expect(result.violations.join(' ')).toMatch(/exceeds the per-route cap/);
    });

    it('flags a thin page carrying an ad', () => {
      const result = evaluateAdDensity({ unitFormats: ['auto'], contentWords: 300 });
      expect(result.withinLimits).toBe(false);
      expect(result.violations.join(' ')).toMatch(/words per ad unit/);
    });

    it('flags reserved height dominating the page', () => {
      // 3 rectangles = 750px reserved; 1,200 words ≈ 3,054px estimated content
      // => 24.6% (passes). Two full-height units over less prose breaks the cap.
      const ok = evaluateAdDensity({
        unitFormats: ['rectangle', 'rectangle', 'rectangle'],
        contentWords: 1200,
      });
      expect(ok.withinLimits).toBe(true);
      const bad = evaluateAdDensity({
        unitFormats: ['vertical', 'vertical'],
        contentWords: 900,
      });
      expect(bad.withinLimits).toBe(false);
      expect(bad.violations.join(' ')).toMatch(/reserved ad height/);
    });

    it('flags units stacked ahead of the content', () => {
      const result = evaluateAdDensity({
        unitFormats: ['leaderboard', 'rectangle'],
        contentWords: 2000,
        unitsBeforeContent: 2,
      });
      expect(result.withinLimits).toBe(false);
      expect(result.violations.join(' ')).toMatch(/precede the publisher content/);
    });

    it('treats a page with no inventory as compliant', () => {
      // The everyday case in a build with no slot env: AdSlot renders nothing,
      // so most routes legitimately carry zero units (CODE-01 null guard).
      const result = evaluateAdDensity({ unitFormats: [], contentWords: 0 });
      expect(result.withinLimits).toBe(true);
      expect(result.wordsPerUnit).toBe(Infinity);
    });

    it("bills AdSlot's default 'auto' format at the height its wrapper reserves", () => {
      expect(reservedHeightPx(['auto'])).toBe(280);
    });

    it('bills unknown formats at the conservative responsive height', () => {
      expect(reservedHeightPx(['not-a-format'])).toBe(reservedHeightPx(['responsive']));
    });

    it('estimates content height monotonically', () => {
      expect(estimateContentHeightPx(1000)).toBeGreaterThan(estimateContentHeightPx(500));
      expect(estimateContentHeightPx(0)).toBe(0);
    });
  });
});
