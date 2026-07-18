/**
 * calculator-presets.tsx — unit tests (부속U U-01).
 *
 * No React Testing Library / jsdom in this repo (vitest runs in the plain
 * `node` environment — see ad-slot.test.ts / ad-exclusion-zones.test.ts for
 * the same documented constraint), so — matching repo convention — this is a
 * SOURCE-LEVEL regression guard over the component's own text, enforcing the
 * 부속U §4 U-01 acceptance criteria that can't be pinned by the pure-data
 * test in constants/__tests__/calculator-presets.test.ts:
 *
 *   1. Clicking a preset uses updateInput() — the real user-interaction code
 *      path (부속I T03 hasUserInteracted guard) — never setInput()/
 *      resetToDefaults(), which would silently suppress calc_input_start /
 *      calculator_complete.
 *   2. The component never calls trackEvent() itself — calculator_complete
 *      must fire with ONLY calc_type (+result_bucket), no `preset` param,
 *      via the existing effect in calculator-client.tsx.
 *   3. It never mounts an ad component (부속M K05 ad-exclusion policy).
 *   4. It's wired into CalculatorClient, above CalculatorPanel/the mobile
 *      sheet trigger — i.e. above-fold and adjacent to the inputs on every
 *      viewport, not just the desktop sidebar.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Strips `/** *\/`-style block comments and `//` line comments before
 * matching CODE-level "must not call X" assertions below — this file's own
 * JSDoc intentionally documents (in prose) the exact APIs it must NOT call
 * at runtime (setInput/trackEvent/TermsGate/AdSlot etc.), so a raw
 * substring match against those names would false-positive on the
 * documentation itself. Matching against comment-stripped source is the
 * accurate check of what the component actually DOES.
 */
function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

const presetsSrcRaw = readFileSync(join(__dirname, '..', 'calculator-presets.tsx'), 'utf-8');
const presetsSrc = stripComments(presetsSrcRaw);
const clientSrc = readFileSync(join(__dirname, '..', 'calculator-client.tsx'), 'utf-8');

describe('CalculatorPresets — funnel-guard code path (부속U U-01)', () => {
  it('applies preset values via updateInput() (the real interactionCount-bumping path)', () => {
    expect(presetsSrc).toMatch(/updateInput\(/);
  });

  it('never calls setInput() or resetToDefaults() (those do NOT count as a real interaction — see calculator.store.ts)', () => {
    expect(presetsSrc).not.toMatch(/\bsetInput\(/);
    expect(presetsSrc).not.toMatch(/\bresetToDefaults\(/);
  });

  it('never calls trackEvent() directly — calculator_complete must fire with calc_type only, via the existing effect, never a `preset` param', () => {
    expect(presetsSrc).not.toMatch(/trackEvent\(/);
    expect(presetsSrc).not.toMatch(/['"]preset['"]\s*:/);
  });

  it('never mounts an ad component (부속M K05)', () => {
    expect(presetsSrc).not.toMatch(/AdSlot|AdProvider|ResultMonetization/);
  });

  it('does not bypass or reference TermsGate consent state (results stay gated behind the existing clickwrap)', () => {
    expect(presetsSrc).not.toMatch(/TermsGate|firepath_terms_consent/);
  });
});

describe('CalculatorPresets wiring in CalculatorClient (above-fold, adjacent to inputs, every viewport)', () => {
  it('CalculatorClient imports and renders <CalculatorPresets />', () => {
    expect(clientSrc).toMatch(/import \{ CalculatorPresets \}/);
    expect(clientSrc).toMatch(/<CalculatorPresets\s*\/>/);
  });

  it('<CalculatorPresets /> renders before the desktop sidebar / mobile sheet (CalculatorPanel) — visible without opening the mobile sheet', () => {
    const presetsIdx = clientSrc.indexOf('<CalculatorPresets');
    const asideIdx = clientSrc.indexOf('<aside');
    const sheetIdx = clientSrc.indexOf('<Sheet>');
    expect(presetsIdx).toBeGreaterThan(-1);
    expect(asideIdx).toBeGreaterThan(presetsIdx);
    expect(sheetIdx).toBeGreaterThan(presetsIdx);
  });
});
