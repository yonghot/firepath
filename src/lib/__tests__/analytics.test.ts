/**
 * analytics.ts — unit tests (부속I T02)
 *
 * This repo's vitest config runs in the default `node` environment (no
 * jsdom/happy-dom dependency is installed — see vitest.config.ts). Rather
 * than adding a new DOM-library dependency for this one module, these tests
 * install a minimal `window` stub (global object + localStorage +
 * location.search) sufficient to exercise trackEvent()/initTrafficMarker()'s
 * actual branches, matching the environment-detection contract
 * (`typeof window === 'undefined'`) the module itself relies on.
 *
 * Tests:
 *   1. trackEvent — no-op on server (no window global at all)
 *   2. trackEvent — no-op when window.gtag isn't a function
 *   3. trackEvent — merges { site } into every call
 *   4. trackEvent — adds traffic_type:'internal' when the crew marker is set
 *   5. trackEvent — does NOT add traffic_type when the marker is absent
 *   6. trackEvent — adds debug_mode:true when NEXT_PUBLIC_GA_DEBUG=1
 *   7. trackEvent — never throws when localStorage access fails
 *   8. initTrafficMarker — ?crew=1 sets the marker + pushes gtag('set', ...)
 *   9. initTrafficMarker — ?crew=0 clears the marker
 *  10. initTrafficMarker — no crew query param → no-op (marker untouched)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Minimal window/localStorage stub ───────────────────────────────────────

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

interface StubWindow {
  gtag?: (...args: unknown[]) => void;
  localStorage: MemoryStorage;
  location: { search: string };
}

function installWindow(search = ''): StubWindow {
  const stub: StubWindow = {
    localStorage: new MemoryStorage(),
    location: { search },
  };
  (globalThis as unknown as { window: StubWindow }).window = stub;
  return stub;
}

function uninstallWindow(): void {
  delete (globalThis as unknown as { window?: StubWindow }).window;
}

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  uninstallWindow();
  vi.restoreAllMocks();
});

// ─── trackEvent ────────────────────────────────────────────────────────────

describe('trackEvent', () => {
  it('is a no-op on the server (no window global)', async () => {
    uninstallWindow();
    const { trackEvent } = await import('@/lib/analytics');
    expect(() => trackEvent('calc_input_start', { calc_type: 'fire_timeline' })).not.toThrow();
  });

  it('is a no-op when window.gtag is not a function', async () => {
    installWindow();
    const { trackEvent } = await import('@/lib/analytics');
    expect(() => trackEvent('calc_input_start', { calc_type: 'fire_timeline' })).not.toThrow();
  });

  it('calls window.gtag("event", name, params) and merges { site }', async () => {
    const w = installWindow();
    const gtagSpy = vi.fn();
    w.gtag = gtagSpy;

    const { trackEvent, SITE_ID } = await import('@/lib/analytics');
    trackEvent('calc_input_start', { calc_type: 'fire_timeline' });

    expect(gtagSpy).toHaveBeenCalledTimes(1);
    expect(gtagSpy).toHaveBeenCalledWith(
      'event',
      'calc_input_start',
      expect.objectContaining({ site: SITE_ID, calc_type: 'fire_timeline' })
    );
  });

  it('merges site + traffic_type:"internal" when the crew marker is set', async () => {
    const w = installWindow();
    const gtagSpy = vi.fn();
    w.gtag = gtagSpy;
    w.localStorage.setItem('cc_traffic_type', 'internal');

    const { trackEvent } = await import('@/lib/analytics');
    trackEvent('calculator_complete', { calc_type: 'fire_timeline' });

    expect(gtagSpy).toHaveBeenCalledWith(
      'event',
      'calculator_complete',
      expect.objectContaining({ traffic_type: 'internal' })
    );
  });

  it('does NOT add traffic_type when the crew marker is absent', async () => {
    const w = installWindow();
    const gtagSpy = vi.fn();
    w.gtag = gtagSpy;

    const { trackEvent } = await import('@/lib/analytics');
    trackEvent('calculator_complete', { calc_type: 'fire_timeline' });

    const params = gtagSpy.mock.calls[0][2] as Record<string, unknown>;
    expect(params.traffic_type).toBeUndefined();
  });

  it('adds debug_mode:true when NEXT_PUBLIC_GA_DEBUG=1', async () => {
    // trackEvent() reads process.env.NEXT_PUBLIC_GA_DEBUG at call time (not
    // module-load time), so setting it directly around the call is enough —
    // no need to reset modules for this one.
    process.env.NEXT_PUBLIC_GA_DEBUG = '1';
    try {
      const w = installWindow();
      const gtagSpy = vi.fn();
      w.gtag = gtagSpy;

      const { trackEvent } = await import('@/lib/analytics');
      trackEvent('calculator_complete', { calc_type: 'fire_timeline' });

      expect(gtagSpy).toHaveBeenCalledWith(
        'event',
        'calculator_complete',
        expect.objectContaining({ debug_mode: true })
      );
    } finally {
      delete process.env.NEXT_PUBLIC_GA_DEBUG;
    }
  });

  it('never throws when localStorage access fails', async () => {
    const w = installWindow();
    const gtagSpy = vi.fn();
    w.gtag = gtagSpy;
    w.localStorage.getItem = () => {
      throw new Error('quota exceeded');
    };

    const { trackEvent } = await import('@/lib/analytics');
    expect(() => trackEvent('calc_input_start', { calc_type: 'fire_timeline' })).not.toThrow();
  });
});

// ─── initTrafficMarker ───────────────────────────────────────────────────────

describe('initTrafficMarker', () => {
  it('?crew=1 sets the localStorage marker and calls gtag("set", ...)', async () => {
    const w = installWindow('?crew=1');
    const gtagSpy = vi.fn();
    w.gtag = gtagSpy;

    const { initTrafficMarker } = await import('@/lib/analytics');
    initTrafficMarker();

    expect(w.localStorage.getItem('cc_traffic_type')).toBe('internal');
    expect(gtagSpy).toHaveBeenCalledWith('set', { traffic_type: 'internal' });
  });

  it('?crew=0 clears the localStorage marker', async () => {
    const w = installWindow('?crew=0');
    w.localStorage.setItem('cc_traffic_type', 'internal');

    const { initTrafficMarker } = await import('@/lib/analytics');
    initTrafficMarker();

    expect(w.localStorage.getItem('cc_traffic_type')).toBeNull();
  });

  it('no crew param is a no-op (marker untouched)', async () => {
    const w = installWindow('?utm_source=embed');

    const { initTrafficMarker } = await import('@/lib/analytics');
    initTrafficMarker();

    expect(w.localStorage.getItem('cc_traffic_type')).toBeNull();
  });
});
