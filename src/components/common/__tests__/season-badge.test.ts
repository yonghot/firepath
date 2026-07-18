/**
 * season-badge.tsx — unit tests (부속U U-04).
 *
 * `nextAnnouncement()` is pure (no window/Date.now() access beyond the
 * injected `now`), so its date math is fully unit-testable without RTL/jsdom
 * (this repo runs vitest in the plain `node` environment — see ad-slot.test.ts).
 * The component's JSX/token-styling contract is checked via source
 * inspection, matching every other "render test" in this repo.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { nextAnnouncement } from '../season-badge';

describe('nextAnnouncement() — real IRS COLA announcement cadence (November)', () => {
  it('on 2026-07-18 (today, per project context) resolves to "announce Nov 2026, limits year 2027" — matches 부속U §5\'s literal example', () => {
    const result = nextAnnouncement(new Date('2026-07-18T00:00:00Z'));
    expect(result).toEqual({ announceYear: 2026, limitsYear: 2027 });
  });

  it('in January (well before November) still targets that same year\'s November', () => {
    const result = nextAnnouncement(new Date('2026-01-05T00:00:00Z'));
    expect(result).toEqual({ announceYear: 2026, limitsYear: 2027 });
  });

  it('in October (the month before) still targets that same year\'s November', () => {
    const result = nextAnnouncement(new Date('2026-10-31T00:00:00Z'));
    expect(result).toEqual({ announceYear: 2026, limitsYear: 2027 });
  });

  it('in December (after November has passed) rolls forward to next year\'s November', () => {
    const result = nextAnnouncement(new Date('2026-12-15T00:00:00Z'));
    expect(result).toEqual({ announceYear: 2027, limitsYear: 2028 });
  });

  it('never regresses to a past announcement year relative to `now`', () => {
    const now = new Date('2030-03-01T00:00:00Z');
    const result = nextAnnouncement(now);
    expect(result.announceYear).toBeGreaterThanOrEqual(now.getFullYear());
    expect(result.limitsYear).toBeGreaterThan(result.announceYear);
  });
});

describe('SeasonBadge — token styling and honest framing (부속U §7: no fabricated dates)', () => {
  const src = readFileSync(join(__dirname, '..', 'season-badge.tsx'), 'utf-8');

  it('uses the same subtle token pill styling as UpdatedBadge, never AdSlot\'s dashed placeholder', () => {
    expect(src).toMatch(/border-border bg-muted\/40/);
    // Strip block comments — the file's own JSDoc explains in prose that it
    // must NOT use AdSlot's dashed treatment, which would otherwise
    // false-positive a raw substring match against the documentation itself.
    const codeOnly = src.replace(/\/\*[\s\S]*?\*\//g, '');
    expect(codeOnly).not.toMatch(/border-dashed/);
  });

  it('frames the future announcement as an expectation ("typically") rather than asserting a confirmed IRS date', () => {
    expect(src).toMatch(/typically announces/i);
  });

  it('cites a real, verifiable IRS source URL and release number in a code comment (no fabrication)', () => {
    expect(src).toMatch(/irs\.gov\/newsroom\/401k-limit-increases-to-24500-for-2026/);
    expect(src).toMatch(/IR-2025-111/);
  });
});
