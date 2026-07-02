/**
 * use-calculator-persistence.ts — unit tests (부속I T16 acceptance criteria)
 *
 * Same window-stub pattern as analytics.test.ts (this repo's vitest config
 * runs in the plain `node` environment — no jsdom/happy-dom). Exercises the
 * exported pure/state-free helpers (clearAllCalculatorData,
 * getRecentCalculations) directly; the React hook itself
 * (useCalculatorPersistence) is exercised indirectly through the same
 * localStorage contract these helpers share, since no React
 * hook-testing-library is installed in this repo.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

class MemoryStorage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
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
  localStorage: MemoryStorage;
}

function installWindow(): StubWindow {
  const stub: StubWindow = { localStorage: new MemoryStorage() };
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

describe('clearAllCalculatorData', () => {
  it('removes every cc_* key and leaves non-cc_ keys untouched', async () => {
    const w = installWindow();
    w.localStorage.setItem('cc_state_fire_timeline', JSON.stringify({ schema: 1, data: {} }));
    w.localStorage.setItem('cc_recent', JSON.stringify([{ calcType: 'fire_timeline', savedAt: '2026-01-01', path: '/' }]));
    w.localStorage.setItem('cc_traffic_type', 'internal');
    w.localStorage.setItem('unrelated_key', 'keep-me');

    const { clearAllCalculatorData } = await import('@/hooks/use-calculator-persistence');
    clearAllCalculatorData();

    expect(w.localStorage.getItem('cc_state_fire_timeline')).toBeNull();
    expect(w.localStorage.getItem('cc_recent')).toBeNull();
    expect(w.localStorage.getItem('cc_traffic_type')).toBeNull();
    expect(w.localStorage.getItem('unrelated_key')).toBe('keep-me');
  });

  it('is a no-op on the server (no window global) — never throws', async () => {
    uninstallWindow();
    const { clearAllCalculatorData } = await import('@/hooks/use-calculator-persistence');
    expect(() => clearAllCalculatorData()).not.toThrow();
  });
});

describe('getRecentCalculations', () => {
  it('returns [] when no index has been written', async () => {
    installWindow();
    const { getRecentCalculations } = await import('@/hooks/use-calculator-persistence');
    expect(getRecentCalculations()).toEqual([]);
  });

  it('returns entries written by the persistence hook contract (calcType + savedAt + path only — no result values)', async () => {
    const w = installWindow();
    const entries = [
      { calcType: 'fire_timeline', savedAt: '2026-07-01T00:00:00.000Z', path: '/' },
      { calcType: 'healthcare_bridge', savedAt: '2026-06-30T00:00:00.000Z', path: '/healthcare-bridge' },
    ];
    w.localStorage.setItem('cc_recent', JSON.stringify(entries));

    const { getRecentCalculations } = await import('@/hooks/use-calculator-persistence');
    const result = getRecentCalculations();

    expect(result).toHaveLength(2);
    for (const entry of result) {
      expect(Object.keys(entry).sort()).toEqual(['calcType', 'path', 'savedAt']);
    }
  });

  it('discards malformed entries rather than throwing', async () => {
    const w = installWindow();
    w.localStorage.setItem('cc_recent', JSON.stringify([{ calcType: 'x' }, 'not-an-object', 42]));

    const { getRecentCalculations } = await import('@/hooks/use-calculator-persistence');
    expect(getRecentCalculations()).toEqual([]);
  });

  it('never throws on corrupt JSON', async () => {
    const w = installWindow();
    w.localStorage.setItem('cc_recent', '{not valid json');

    const { getRecentCalculations } = await import('@/hooks/use-calculator-persistence');
    expect(() => getRecentCalculations()).not.toThrow();
    expect(getRecentCalculations()).toEqual([]);
  });
});
