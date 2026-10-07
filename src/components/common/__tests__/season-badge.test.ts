/**
 * season-badge.tsx — unit tests (부속U U-04).
 *
 * The badge reads the retirement-limits data state (src/lib/data/retirement-limits.ts),
 * never the clock; tests/regressions/data-state-no-clock.test.ts holds the clock-independence
 * and page-string derivation assertions. This file keeps the component's styling and
 * honest-framing contract and the source citation, which now lives in the data module.
 * Runs in the plain `node` environment, so the JSX contract is checked via source inspection.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SeasonBadge } from '../season-badge';
import { getRetirementLimitsState } from '@/lib/data/retirement-limits';

describe('SeasonBadge — text from the data state', () => {
  const text = renderToStaticMarkup(createElement(SeasonBadge)).replace(/<[^>]*>/g, '').trim();

  it('names the next unpublished IRS limits year while it is unpublished', () => {
    const { irs } = getRetirementLimitsState();
    expect(irs.next.status).toBe('unpublished');
    expect(irs.next.data).toBeNull();
    expect(text).toBe(`IRS typically announces ${irs.next.year} retirement limits in October or November — bookmark your plan`);
  });

  it('forwards className to the pill', () => {
    const html = renderToStaticMarkup(createElement(SeasonBadge, { className: 'ml-0' }));
    expect(html).toMatch(/class="[^"]*\bml-0\b/);
  });
});

describe('SeasonBadge — token styling and honest framing (부속U §7: no fabricated dates)', () => {
  const src = readFileSync(join(__dirname, '..', 'season-badge.tsx'), 'utf-8');

  it('uses the same subtle token pill styling as UpdatedBadge, never AdSlot\'s dashed placeholder', () => {
    expect(src).toMatch(/border-border bg-muted\/40/);
    expect(src.replace(/\/\*[\s\S]*?\*\//g, '')).not.toMatch(/border-dashed/);
  });

  it('frames the future announcement as an expectation ("typically") rather than asserting a confirmed IRS date', () => {
    expect(src).toMatch(/typically announces/i);
  });
});

describe('retirement-limits data module — cited IRS source (no fabrication)', () => {
  it('records the real 2026 IRS announcement with its release number, notice and URL', () => {
    const { irs } = getRetirementLimitsState();
    expect(irs.current.data.sourceUrl).toMatch(/irs\.gov\/newsroom\/401k-limit-increases-to-24500-for-2026/);
    expect(irs.current.data.pressRelease).toBe('IR-2025-111');
    expect(irs.current.data.noticeNumber).toBe('Notice 2025-67');
  });
});
