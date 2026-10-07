/**
 * Ad exclusion-zone / oclick-proximity audit — unit tests (부속M K05).
 *
 * Enforces, at the source-composition level, the claims documented in
 * docs/ad-exclusion-zones.md: no ad container (AdSlot/AdProvider/
 * ResultMonetization) renders within the same layout column as, or
 * immediately adjacent to, calculator inputs/submit-style controls on any
 * page. As with ad-slot.test.ts, this repo has no jsdom/React Testing
 * Library (see that file's header comment for the documented reason), so
 * these are source-inspection assertions over the actual page/component
 * files rather than a rendered-DOM measurement — the strongest guard
 * available without adding a new test-infra dependency.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_MAIN = join(__dirname, '..', '..', '..', 'app', '(main)');
const APP_UTILITY = join(__dirname, '..', '..', '..', 'app', '(utility)');

function read(relPath: string, root = APP_MAIN): string {
  return readFileSync(join(root, relPath), 'utf-8');
}

describe('Ad exclusion zones — pages with calculator inputs never mount an ad in the input column (부속M K05)', () => {
  it('/fire-types mounts no AdSlot/AdProvider/ResultMonetization at all', () => {
    const src = read('fire-types/page.tsx');
    expect(src).not.toMatch(/AdSlot|AdProvider|ResultMonetization/);
  });

  it('/healthcare-bridge mounts no AdSlot/AdProvider/ResultMonetization at all', () => {
    const src = read('healthcare-bridge/page.tsx');
    expect(src).not.toMatch(/AdSlot|AdProvider|ResultMonetization/);
  });
});

describe('Ad exclusion zones — home page (/) buffer contract (부속M K05)', () => {
  const src = read('page.tsx');

  it('CalculatorClient (sliders) and ResultMonetization (ad) are SIBLINGS, not nested', () => {
    // If ResultMonetization were ever moved inside CalculatorClient's JSX
    // tree (as opposed to a sibling in the page), it would risk sharing the
    // sticky-sidebar column with the input sliders. Assert the page renders
    // them as top-level sibling elements in this exact order.
    const calcIdx = src.indexOf('<CalculatorClient');
    const adIdx = src.indexOf('<ResultMonetization');
    expect(calcIdx).toBeGreaterThan(-1);
    expect(adIdx).toBeGreaterThan(-1);
    expect(adIdx).toBeGreaterThan(calcIdx);
  });

  it('page.tsx itself does not import SliderInput/CalculatorPanel directly (inputs stay encapsulated inside CalculatorClient, away from the page-level ad mount)', () => {
    expect(src).not.toMatch(/SliderInput|CalculatorPanel/);
  });
});

describe('Ad exclusion zones — /result page has zero calculator inputs on the ad-bearing page (부속M K05)', () => {
  it('result/page.tsx does not import CalculatorPanel/SliderInput (no input controls on this page)', () => {
    const src = read('result/page.tsx', APP_UTILITY);
    expect(src).not.toMatch(/SliderInput|CalculatorPanel/);
  });

  it('ResultClient (chart/result cards) and ResultMonetization (ad) are siblings, ad last', () => {
    const src = read('result/page.tsx', APP_UTILITY);
    const resultIdx = src.indexOf('<ResultClient');
    const adIdx = src.indexOf('<ResultMonetization');
    expect(resultIdx).toBeGreaterThan(-1);
    expect(adIdx).toBeGreaterThan(-1);
    expect(adIdx).toBeGreaterThan(resultIdx);
  });
});

describe('Ad exclusion zones — buffer components sit between results and the ad on CalculatorClient (부속M K05)', () => {
  const src = readFileSync(
    join(__dirname, '..', '..', 'features', 'calculator', 'calculator-client.tsx'),
    'utf-8'
  );

  it('ResultRelated, MonteCarloPanel, and PortfolioPanel all render after the result cards and before the component ends (buffer before any page-level ad mount)', () => {
    const resultCardsIdx = src.indexOf('<ResultsPanel');
    const resultRelatedIdx = src.indexOf('<ResultRelated');
    const monteCarloIdx = src.indexOf('<MonteCarloPanel');
    const portfolioIdx = src.indexOf('<PortfolioPanel');

    expect(resultCardsIdx).toBeGreaterThan(-1);
    expect(resultRelatedIdx).toBeGreaterThan(resultCardsIdx);
    expect(monteCarloIdx).toBeGreaterThan(resultRelatedIdx);
    expect(portfolioIdx).toBeGreaterThan(monteCarloIdx);
  });

  it('CalculatorClient does not import or render AdSlot/AdProvider/ResultMonetization itself (ad mounting stays at the page level, never inside the sticky-sidebar tree)', () => {
    // Match actual imports/JSX usage, not incidental prose mentions in
    // comments (e.g. "...distinct treatment from AdSlot's dashed
    // placeholder" is documentation, not a mount).
    expect(src).not.toMatch(/from ['"]@\/components\/(common\/ad-slot|monetization\/(AdProvider|ResultMonetization))['"]/);
    expect(src).not.toMatch(/<(AdSlot|AdProvider|ResultMonetization)\b/);
  });
});

describe('Ad exclusion zones — CalculatorPresets (부속U U-01) never mounts an ad and stays visually distinct from AdSlot', () => {
  const src = readFileSync(
    join(__dirname, '..', '..', 'features', 'calculator', 'calculator-presets.tsx'),
    'utf-8'
  );

  it('does not import or render AdSlot/AdProvider/ResultMonetization', () => {
    expect(src).not.toMatch(/from ['"]@\/components\/(common\/ad-slot|monetization\/(AdProvider|ResultMonetization))['"]/);
    expect(src).not.toMatch(/<(AdSlot|AdProvider|ResultMonetization)\b/);
  });

  it('never uses AdSlot\'s dashed-placeholder styling ("border-dashed"), so presets stay visually distinct from ad units', () => {
    // Strip block comments first — the file's own JSDoc explains (in prose)
    // that it must NOT use this class, which would otherwise false-positive
    // a raw substring match against the documentation itself.
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeOnly).not.toMatch(/border-dashed/);
  });
});

describe('Ad exclusion zones — guide pages have no calculator inputs adjacent to the ad (부속M K05)', () => {
  it('/guide/[slug] renders AdSlot only after the article body and CTA block, and never mounts a calculator input', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', '..', 'app', '(main)', 'guide', '[slug]', 'page.tsx'),
      'utf-8'
    );
    expect(src).not.toMatch(/SliderInput|CalculatorPanel/);
    const ctaIdx = src.indexOf('Open Calculator');
    const adIdx = src.indexOf('<AdSlot');
    expect(ctaIdx).toBeGreaterThan(-1);
    expect(adIdx).toBeGreaterThan(ctaIdx);
  });

  it('/guide index page never mounts a calculator input', () => {
    const src = readFileSync(join(__dirname, '..', '..', '..', 'app', '(main)', 'guide', 'page.tsx'), 'utf-8');
    expect(src).not.toMatch(/SliderInput|CalculatorPanel/);
  });
});
