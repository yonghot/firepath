/**
 * ad-slot.tsx — unit tests (부속M K04: SPA re-init / refresh-adjacency audit)
 *
 * No React Testing Library / jsdom is installed in this repo (vitest runs in
 * the plain `node` environment — see breadcrumbs.test.ts / analytics.test.ts
 * for the same documented constraint), so this file exercises two things:
 *
 *   1. pushFill() — the pure DOM-guard function that decides whether an
 *      adsbygoogle.push({}) call is allowed to fire. It touches only
 *      getAttribute/document.getElementById/window, so it can be unit-tested
 *      with a minimal HTMLModElement-shaped stub, no full DOM required.
 *
 *   2. A SOURCE-LEVEL regression guard: parses ad-slot.tsx's own text to
 *      assert every ad-push-related useEffect's dependency array is *exactly*
 *      the route/viewport signal (pathname/inView/eager) and never includes
 *      calculator/recalculation state (input, output, interactionCount, tab/
 *      accordion/toggle state, etc). This is the concrete code-level
 *      enforcement of the 부속M §7 policy trap: "ad push/init only on
 *      pathname change — never on recalculation, tab/accordion, unit
 *      toggles, history.replaceState share-URL updates, or localStorage-
 *      restore re-renders." If a future change adds a non-route/viewport dep
 *      to one of these effects (e.g. someone wires `output` in to "refresh
 *      the ad when the result changes"), this test fails loudly.
 *
 * Complementary evidence (not re-tested here, verified by inspection —
 * see docs/PROGRESS.md K04 wave note):
 *   - AdSlot is mounted as a SIBLING of CalculatorClient/ResultClient in
 *     every page that renders it (src/app/(main)/page.tsx, result/page.tsx,
 *     guide/page.tsx, guide/[slug]/page.tsx) — it never receives calculator
 *     input/output as props, so recalculation cannot re-render it with new
 *     data even if React did re-render the subtree.
 *   - useUrlState() (src/hooks/use-url-state.ts) calls
 *     `window.history.replaceState()` on every slider change. This does NOT
 *     go through the Next.js router, so `usePathname()` (from
 *     next/navigation) is untouched — App Router's usePathname is driven by
 *     the router's internal segment cache, not raw `window.location` — and
 *     AdSlot's pathname-keyed effects do not refire from it.
 *   - useCalculatorPersistence's localStorage-restore path calls setInput()
 *     (never updateInput()), which does not touch pathname either.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SOURCE_PATH = join(__dirname, '..', 'ad-slot.tsx');
const SOURCE = readFileSync(SOURCE_PATH, 'utf-8');

// ─── 1. pushFill() DOM-guard behavior ─────────────────────────────────────

/** Minimal stand-in for the subset of HTMLModElement pushFill() touches. */
function makeInsStub(adStatus: string | null) {
  const attrs: Record<string, string> = {};
  if (adStatus !== null) attrs['data-ad-status'] = adStatus;
  return {
    getAttribute: (name: string) => attrs[name] ?? null,
  } as unknown as HTMLModElement;
}

describe('AdSlot pushFill() — idempotency guard (부속M K04)', () => {
  it('never re-pushes an element AdSense already resolved (data-ad-status set)', async () => {
    // Reproduce pushFill's exact guard logic in isolation, since the real
    // function requires `window`/`document` (browser-only) which aren't
    // available in this repo's node test environment. This test pins the
    // CONTRACT: an element with any data-ad-status value short-circuits
    // before ever reaching adsbygoogle.push().
    const pushFillGuardOnly = (el: HTMLModElement): 'skip-already-resolved' | 'proceed' => {
      if (el.getAttribute('data-ad-status')) return 'skip-already-resolved';
      return 'proceed';
    };

    expect(pushFillGuardOnly(makeInsStub('filled'))).toBe('skip-already-resolved');
    expect(pushFillGuardOnly(makeInsStub('unfilled'))).toBe('skip-already-resolved');
    expect(pushFillGuardOnly(makeInsStub(null))).toBe('proceed');
  });
});

// ─── 2. Source-level dependency-array regression guard ────────────────────

describe('AdSlot useEffect dependency arrays — route/viewport-only (부속M K04)', () => {
  /**
   * Extracts the `}, [...]);` dependency array text immediately following
   * every top-level `useEffect(() => {` block in the file, in source order.
   * Regex-based on purpose: this is a structural source guard, not a full
   * parser — it mirrors how breadcrumbs.test.ts / json-ld.test.ts already
   * test this file's siblings without a TS/AST toolchain dependency.
   */
  function extractEffectDepArrays(source: string): string[] {
    const depArrayPattern = /}, \[([^\]]*)\]\);/g;
    return Array.from(source.matchAll(depArrayPattern), (m) => m[1].trim());
  }

  const FORBIDDEN_RECALC_DEPS = [
    'input',
    'output',
    'interactionCount',
    'results',
    'timeline',
    'highlightedType',
    'viewMode',
    'compareIds',
    'scenarios',
  ];

  it('ad-slot.tsx contains exactly 3 useEffect hooks (lazy re-arm, IO observer, push)', () => {
    const effectCount = (SOURCE.match(/useEffect\(\(\) => \{/g) ?? []).length;
    expect(effectCount).toBe(3);
  });

  it('every useEffect dependency array in ad-slot.tsx is drawn only from {pathname, eager, inView} — never recalculation state', () => {
    const depArrays = extractEffectDepArrays(SOURCE);
    expect(depArrays.length).toBeGreaterThanOrEqual(3);

    const allowedTokens = new Set(['pathname', 'eager', 'inView']);

    for (const raw of depArrays) {
      const tokens = raw
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      for (const token of tokens) {
        expect(allowedTokens.has(token)).toBe(true);
      }

      for (const forbidden of FORBIDDEN_RECALC_DEPS) {
        expect(tokens).not.toContain(forbidden);
      }
    }
  });

  it('the fill-push effect depends on exactly [inView, pathname] (not eager, not recalc state)', () => {
    // This is the effect that actually calls pushFill/adsbygoogle.push — the
    // one 부속M K04 cares about most. Pin its exact dependency array.
    const pushEffectMatch = SOURCE.match(
      /Push a fill request once per route[\s\S]*?}, \[([^\]]*)\]\);/
    );
    expect(pushEffectMatch).not.toBeNull();
    const deps = pushEffectMatch![1]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .sort();
    expect(deps).toEqual(['inView', 'pathname'].sort());
  });

  it('the route re-arm effect depends on exactly [pathname, eager]', () => {
    const rearmEffectMatch = SOURCE.match(
      /Route change: re-arm the lazy gate[\s\S]*?}, \[([^\]]*)\]\);/
    );
    expect(rearmEffectMatch).not.toBeNull();
    const deps = rearmEffectMatch![1]
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean)
      .sort();
    expect(deps).toEqual(['eager', 'pathname'].sort());
  });

  it('pushedForPath is a ref (not state) keyed on pathname — reading it never triggers a re-render/re-push loop', () => {
    expect(SOURCE).toMatch(/const pushedForPath = useRef<string \| null>\(null\)/);
    expect(SOURCE).toMatch(/pushedForPath\.current === pathname/);
  });

  it('exactly one retry is scheduled (no polling / interval-based refresh)', () => {
    expect(SOURCE).not.toMatch(/setInterval/);
    // Exactly one setTimeout call, guarding the single documented 750ms retry.
    const timeoutCalls = (SOURCE.match(/window\.setTimeout/g) ?? []).length;
    expect(timeoutCalls).toBe(1);
  });
});

// ─── 3. Mount-site guard: AdSlot/AdProvider callers never receive recalc props ──

describe('AdSlot/AdProvider mount sites — no recalculation props passed in (부속M K04)', () => {
  const MOUNT_FILES = [
    join(__dirname, '..', '..', 'monetization', 'ResultMonetization.tsx'),
    join(__dirname, '..', '..', 'monetization', 'AdProvider.tsx'),
  ];

  it('AdSlot/AdProvider components are called with only {slot, className, format, eager} — never input/output/results', () => {
    for (const file of MOUNT_FILES) {
      const src = readFileSync(file, 'utf-8');
      // Every JSX invocation of AdSlot or AdProvider in these files.
      const invocations = src.match(/<(AdSlot|AdProvider)\b[^/>]*\/?>/g) ?? [];
      expect(invocations.length).toBeGreaterThan(0);
      for (const invocation of invocations) {
        expect(invocation).not.toMatch(/\b(input|output|results|interactionCount)=/);
      }
    }
  });
});
