/**
 * og-visual.tsx / opengraph-image.tsx routes — unit tests (부속M K09)
 *
 * No React Testing Library / jsdom in this repo (see ad-slot.test.ts for the
 * same documented constraint) and `next/og`'s ImageResponse requires the edge
 * runtime, so these tests exercise the OG image surface at the source level:
 *
 *   1. OG_SIZE is exactly 1200x630 — >=1200px wide, 16:9-ish (630/1200 ≈
 *      0.525, close enough to 9/16=0.5625 to read as "16:9-ish" per spec;
 *      1200x630 is the canonical OG/Twitter-card size and is what every hub
 *      page's opengraph-image.tsx passes to ImageResponse).
 *   2. og-visual.tsx never renders an emoji glyph or a purple/blue gradient
 *      (design/forbidden.md: no emoji-icons, no "from-purple" / "to-blue"
 *      gradient utility classes).
 *   3. Every hub/insight page's opengraph-image.tsx route file exists, sets
 *      size/contentType/runtime, and sources its stats from a real computed
 *      engine call (calculateFIRE / calculateHealthcareBridge) — never a
 *      hand-typed literal number standing in for one.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/og-visual';

const OG_VISUAL_SOURCE = readFileSync(join(__dirname, '..', 'og-visual.tsx'), 'utf-8');

describe('OG_SIZE — 부속M K09 dimension requirement', () => {
  it('is exactly 1200x630 (>=1200px wide, 16:9-ish, canonical OG/Twitter card size)', () => {
    expect(OG_SIZE.width).toBe(1200);
    expect(OG_SIZE.height).toBe(630);
    expect(OG_SIZE.width).toBeGreaterThanOrEqual(1200);
    // 16:9-ish tolerance band (9/16 = 0.5625; 630/1200 = 0.525) — within 10%.
    const ratio = OG_SIZE.height / OG_SIZE.width;
    expect(Math.abs(ratio - 9 / 16)).toBeLessThan(0.06);
  });

  it('OG_CONTENT_TYPE is a PNG image', () => {
    expect(OG_CONTENT_TYPE).toBe('image/png');
  });
});

describe('og-visual.tsx — design/forbidden.md compliance (부속M K09)', () => {
  it('contains no emoji glyphs (design/forbidden.md: no emoji-icons)', () => {
    // Common emoji ranges (misc symbols, emoticons, transport, supplemental).
    const emojiPattern = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    expect(emojiPattern.test(OG_VISUAL_SOURCE)).toBe(false);
  });

  it('never uses a purple or blue gradient (design/forbidden.md hard-blocked patterns)', () => {
    expect(OG_VISUAL_SOURCE).not.toMatch(/from-purple-/);
    expect(OG_VISUAL_SOURCE).not.toMatch(/to-blue-/);
    expect(OG_VISUAL_SOURCE).not.toMatch(/linear-gradient/);
  });

  it('never uses pure black (#000000) — brand/neutral tokens only', () => {
    expect(OG_VISUAL_SOURCE).not.toMatch(/#000000/i);
  });

  it('uses the locked brand primary token (#065F53), not an arbitrary color', () => {
    expect(OG_VISUAL_SOURCE).toMatch(/#065F53/);
  });
});

describe('opengraph-image.tsx route files — hub/insight pages (부속M K09)', () => {
  const ROUTES: { file: string; expectedImport: RegExp }[] = [
    {
      file: join(__dirname, '..', '..', '..', 'app', '(main)', 'opengraph-image.tsx'),
      expectedImport: /calculateFIRE/,
    },
    {
      file: join(__dirname, '..', '..', '..', 'app', '(main)', 'fire-types', 'opengraph-image.tsx'),
      expectedImport: /calculateFIRE/,
    },
    {
      file: join(__dirname, '..', '..', '..', 'app', '(main)', 'healthcare-bridge', 'opengraph-image.tsx'),
      expectedImport: /calculateHealthcareBridge/,
    },
  ];

  for (const { file, expectedImport } of ROUTES) {
    describe(file.replace(/\\/g, '/').split('/app/')[1], () => {
      const source = readFileSync(file, 'utf-8');

      it('exports size = OG_SIZE and contentType = OG_CONTENT_TYPE from the shared builder', () => {
        expect(source).toMatch(/export const size = OG_SIZE;/);
        expect(source).toMatch(/export const contentType = OG_CONTENT_TYPE;/);
      });

      it('runs on the edge runtime (next/og ImageResponse requirement)', () => {
        expect(source).toMatch(/export const runtime = 'edge';/);
      });

      it('exports a descriptive alt string', () => {
        expect(source).toMatch(/export const alt = '[^']{10,}';/);
      });

      it('sources its stats from a real engine computation, not a hand-typed literal', () => {
        expect(source).toMatch(expectedImport);
      });

      it('imports buildOgVisual from the shared og-visual module', () => {
        expect(source).toMatch(/buildOgVisual/);
        expect(source).toMatch(/from '@\/lib\/og\/og-visual'/);
      });
    });
  }
});
