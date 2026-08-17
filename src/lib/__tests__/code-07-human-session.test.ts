/**
 * code-07-human-session.test.ts — 부속W CODE-07.
 *
 * Pins the two properties that make `human_session` worth trusting in GA4:
 *   1. It does NOT fire for a load-and-leave session — the shape of the
 *      datacenter traffic that dominates this property's city breakdown
 *      (docs/ga4-measurement-interpretation.md §2).
 *   2. It fires exactly once per session, on the first qualifying engagement
 *      (25% scroll depth or a real input interaction) — never twice, and never
 *      on a timer, because an idle bot holding a page open would qualify.
 *
 * The no-cloaking half of CODE-07's acceptance (no ad module reads the user
 * agent) is asserted in src/lib/__tests__/ad-density.test.ts.
 *
 * Like src/lib/__tests__/analytics.test.ts, this runs in the repo's default
 * `node` vitest environment against a hand-rolled stub instead of pulling in
 * jsdom: the signal touches only four DOM surfaces (scroll geometry, two event
 * targets, sessionStorage), the stub makes that contract explicit, and the
 * dependency list stays unchanged.
 */

import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';

// ─── Minimal window/document stubs ──────────────────────────────────────────

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

type Listener = (event: unknown) => void;

/** Minimal EventTarget that also records listeners so removal is assertable. */
class StubTarget {
  readonly listeners = new Map<string, Set<Listener>>();
  addEventListener(type: string, fn: Listener): void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(fn);
  }
  removeEventListener(type: string, fn: Listener): void {
    this.listeners.get(type)?.delete(fn);
  }
  dispatch(type: string): void {
    for (const fn of [...(this.listeners.get(type) ?? [])]) fn({ type });
  }
  countFor(type: string): number {
    return this.listeners.get(type)?.size ?? 0;
  }
}

interface StubWindow extends StubTarget {
  gtag?: (...args: unknown[]) => void;
  localStorage: MemoryStorage;
  sessionStorage: MemoryStorage;
  location: { search: string };
  innerHeight: number;
  scrollY: number;
}

interface StubDocument extends StubTarget {
  documentElement: { scrollHeight: number };
  referrer: string;
}

function makeWindow(): StubWindow {
  const target = new StubTarget() as StubWindow;
  target.localStorage = new MemoryStorage();
  target.sessionStorage = new MemoryStorage();
  target.location = { search: '' };
  // 4,000px of content in an 800px viewport => 3,200px scrollable.
  target.innerHeight = 800;
  target.scrollY = 0;
  return target;
}

function makeDocument(): StubDocument {
  const target = new StubTarget() as StubDocument;
  target.documentElement = { scrollHeight: 4000 };
  target.referrer = '';
  return target;
}

let win: StubWindow;
let doc: StubDocument;
let gtagSpy: Mock;

function install(): void {
  win = makeWindow();
  doc = makeDocument();
  gtagSpy = vi.fn();
  win.gtag = gtagSpy;
  (globalThis as unknown as { window: StubWindow }).window = win;
  (globalThis as unknown as { document: StubDocument }).document = doc;
}

function uninstall(): void {
  delete (globalThis as unknown as { window?: StubWindow }).window;
  delete (globalThis as unknown as { document?: StubDocument }).document;
}

/** Every `human_session` event fired so far. */
function humanSessions(): unknown[][] {
  return gtagSpy.mock.calls.filter((c) => c[0] === 'event' && c[1] === 'human_session');
}

function scrollTo(y: number): void {
  win.scrollY = y;
  win.dispatch('scroll');
}

beforeEach(() => {
  vi.resetModules();
  install();
});

afterEach(() => {
  uninstall();
  vi.restoreAllMocks();
});

describe('CODE-07 — human_session engagement signal', () => {
  it('does not fire on a load-and-leave session', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    expect(humanSessions()).toHaveLength(0);
  });

  it('does not fire on a shallow scroll below the 25% threshold', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    scrollTo(500); // 500 / 3200 = 15.6%
    expect(humanSessions()).toHaveLength(0);
  });

  it('fires once at 25% scroll depth, tagged with the trigger', async () => {
    const { initHumanSessionSignal, SITE_ID } = await import('@/lib/analytics');
    initHumanSessionSignal();
    scrollTo(900); // 900 / 3200 = 28%
    const fired = humanSessions();
    expect(fired).toHaveLength(1);
    expect(fired[0][2]).toMatchObject({ engagement_trigger: 'scroll_depth', site: SITE_ID });
  });

  it('fires on a real input interaction even without scrolling', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    doc.dispatch('pointerdown');
    const fired = humanSessions();
    expect(fired).toHaveLength(1);
    expect(fired[0][2]).toMatchObject({ engagement_trigger: 'interaction' });
  });

  it('fires on a keydown as well', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    doc.dispatch('keydown');
    expect(humanSessions()).toHaveLength(1);
  });

  it('never fires twice in one session', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    scrollTo(900);
    scrollTo(2000);
    doc.dispatch('keydown');
    expect(humanSessions()).toHaveLength(1);
  });

  it('detaches its listeners after firing (no idle work, no timers)', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    expect(win.countFor('scroll')).toBe(1);
    expect(doc.countFor('keydown')).toBe(1);
    expect(doc.countFor('pointerdown')).toBe(1);
    scrollTo(900);
    expect(win.countFor('scroll')).toBe(0);
    expect(doc.countFor('keydown')).toBe(0);
    expect(doc.countFor('pointerdown')).toBe(0);
  });

  it('uses no timers at all (a timer would fire for an idle bot)', async () => {
    vi.useFakeTimers();
    try {
      const { initHumanSessionSignal } = await import('@/lib/analytics');
      initHumanSessionSignal();
      vi.advanceTimersByTime(10 * 60 * 1000);
      expect(humanSessions()).toHaveLength(0);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('stays quiet on a re-mount within the same session', async () => {
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    scrollTo(900);
    expect(humanSessions()).toHaveLength(1);
    initHumanSessionSignal(); // e.g. a soft navigation re-running the effect
    scrollTo(3000);
    expect(humanSessions()).toHaveLength(1);
  });

  it('does not fire from scroll on a page shorter than the viewport', async () => {
    doc.documentElement.scrollHeight = 600;
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    initHumanSessionSignal();
    scrollTo(0);
    scrollTo(100);
    expect(humanSessions()).toHaveLength(0);
  });

  it('is inert when GA has not loaded (no throw, nothing queued)', async () => {
    delete win.gtag;
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    expect(() => {
      initHumanSessionSignal();
      scrollTo(900);
    }).not.toThrow();
    expect(gtagSpy).not.toHaveBeenCalled();
  });

  it('never throws when sessionStorage is unavailable', async () => {
    win.sessionStorage.getItem = () => {
      throw new Error('access denied');
    };
    win.sessionStorage.setItem = () => {
      throw new Error('quota exceeded');
    };
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    expect(() => {
      initHumanSessionSignal();
      scrollTo(900);
    }).not.toThrow();
    expect(humanSessions()).toHaveLength(1);
  });

  it('is inert on the server (no window)', async () => {
    uninstall();
    const { initHumanSessionSignal } = await import('@/lib/analytics');
    expect(() => initHumanSessionSignal()).not.toThrow();
    expect(gtagSpy).not.toHaveBeenCalled();
  });
});
