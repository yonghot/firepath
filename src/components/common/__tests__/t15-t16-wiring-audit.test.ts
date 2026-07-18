/**
 * T15 (share button) / T16 (Continue-where-you-left-off banner) wiring audit
 * (부속U U-04).
 *
 * 부속U U-04 asks each repo to AUDIT whether the existing 부속I T15/T16
 * components actually render in the result area and to wire ONLY whatever
 * is un-wired (no re-implementation). This repo's audit result: BOTH are
 * already fully wired —
 *   - ShareResultButtons (T15) renders in the result-cards header on both
 *     the home calculator (CalculatorClient) and /result (ResultClient), and
 *     fires `result_share` on click (see share-result-buttons.tsx).
 *   - ContinueBanner (T16) renders above the calculator whenever
 *     useCalculatorPersistence() finds a saved state (CalculatorClient), and
 *     applying it fires `state_restored` (see use-calculator-persistence.ts).
 *
 * This test is the source-level regression guard that LOCKS IN that audit
 * finding — matching this repo's documented no-jsdom/no-RTL convention (see
 * ad-slot.test.ts), so it's a "render test" via source inspection of the
 * actual page/component files, not a rendered DOM. If a future change ever
 * un-wires either component from the result area, this test fails loudly.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CALCULATOR_DIR = join(__dirname, '..', '..', 'features', 'calculator');

function read(relPath: string): string {
  return readFileSync(join(CALCULATOR_DIR, relPath), 'utf-8');
}

describe('T15 — ShareResultButtons renders in the result area (부속I T15 / 부속U U-04 audit)', () => {
  it('CalculatorClient (home page, "/") imports and renders <ShareResultButtons /> next to the result cards', () => {
    const src = read('calculator-client.tsx');
    expect(src).toMatch(/import \{ ShareResultButtons \}/);
    const resultCardsIdx = src.indexOf('<FIREResultCards');
    const shareIdx = src.indexOf('<ShareResultButtons');
    expect(shareIdx).toBeGreaterThan(-1);
    // Rendered in the same header block as the result cards, not buried
    // elsewhere on the page.
    expect(Math.abs(resultCardsIdx - shareIdx)).toBeLessThan(500);
  });

  it('ResultClient (/result, shared-link destination) imports and renders <ShareResultButtons />', () => {
    const src = read('result-client.tsx');
    expect(src).toMatch(/import \{ ShareResultButtons \}/);
    expect(src).toMatch(/<ShareResultButtons/);
  });

  it('share-result-buttons.tsx fires the result_share GA4 event on both the copy-link and Web Share paths', () => {
    const src = read('share-result-buttons.tsx');
    expect(src.match(/trackEvent\('result_share'/g)?.length).toBe(2);
  });
});

describe('T16 — ContinueBanner renders above the calculator when a saved state exists (부속I T16 / 부속U U-04 audit)', () => {
  it('CalculatorClient imports ContinueBanner and wires it to useCalculatorPersistence()\'s pendingRestore/applyRestore/dismissRestore', () => {
    const src = read('calculator-client.tsx');
    expect(src).toMatch(/import \{ ContinueBanner \}/);
    expect(src).toMatch(/useCalculatorPersistence/);
    expect(src).toMatch(/pendingRestore !== null/);
    expect(src).toMatch(/<ContinueBanner onApply=\{applyRestore\} onDismiss=\{dismissRestore\}/);
  });

  it('applyRestore() fires state_restored (use-calculator-persistence.ts)', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'hooks', 'use-calculator-persistence.ts'), 'utf-8');
    expect(src).toMatch(/trackEvent\('state_restored'/);
  });
});
