import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { populateGlobal } from 'vitest/environments';
import { Window } from 'happy-dom';
import * as consent from '@/lib/consent';

const KEYS = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'] as const;
const DENIED = Object.fromEntries(KEYS.map((key) => [key, 'denied']));
const GRANTED = Object.fromEntries(KEYS.map((key) => [key, 'granted']));
const UNKNOWN = [null, undefined, '', 'ZZ', 'XX', 'T1'] as const;

beforeAll(async () => {
  await import('@/components/common/cookie-consent-banner');
  await import('@/components/common/manage-consent-link');
  await import('react-dom/client');
}, 60_000);

type Fc = { callbackQueue?: Array<() => void>; showRevocationMessage?: () => void };

function pureWindow() {
  const target = new EventTarget() as EventTarget & { googlefc?: Fc };
  let declineOnly = 0;
  let reopened = 0;
  target.addEventListener(consent.DECLINE_ONLY_EVENT, () => (declineOnly += 1));
  target.addEventListener(consent.REOPEN_CONSENT_EVENT, () => (reopened += 1));
  const jobs: Array<{ fn: () => void; ms: number }> = [];
  const schedule = (fn: () => void, ms: number) => void jobs.push({ fn, ms });
  return { target, jobs, schedule, declineOnly: () => declineOnly, reopened: () => reopened };
}

describe('K14-c: openConsentChoices falls back when Google\'s message cannot open', () => {
  it('googlefc absent: the click queues the CMP call and, after at most 2 s, raises the decline-only event once', () => {
    for (const country of UNKNOWN) {
      const w = pureWindow();
      expect(consent.openConsentChoices(w.target, country, true, w.schedule), String(country)).toBe('cmp');
      expect(w.target.googlefc?.callbackQueue, String(country)).toHaveLength(1);
      expect(w.jobs, String(country)).toHaveLength(1);
      expect(w.jobs[0].ms).toBe(consent.CMP_WAIT_MS);
      expect(consent.CMP_WAIT_MS).toBeLessThanOrEqual(2000);
      expect(w.declineOnly()).toBe(0);
      w.jobs[0].fn();
      expect(w.declineOnly(), String(country)).toBe(1);
      expect(w.reopened(), String(country)).toBe(0);
    }
  });

  it('googlefc ready: the queued callback opens Google\'s message and our notice is never requested', () => {
    const w = pureWindow();
    let shown = 0;
    w.target.googlefc = {
      showRevocationMessage: () => (shown += 1),
      callbackQueue: { push: (fn: () => void) => fn() } as unknown as Array<() => void>,
    };
    consent.openConsentChoices(w.target, null, true, w.schedule);
    w.jobs.splice(0).forEach((job) => job.fn());
    expect(shown).toBe(1);
    expect(w.declineOnly()).toBe(0);
  });

  it('googlefc becomes ready inside the wait: its message opens once, our notice is not requested', () => {
    const w = pureWindow();
    consent.openConsentChoices(w.target, 'ZZ', true, w.schedule);
    let shown = 0;
    (w.target.googlefc as Fc).showRevocationMessage = () => (shown += 1);
    (w.target.googlefc as Fc).callbackQueue?.forEach((fn) => fn());
    w.jobs.splice(0).forEach((job) => job.fn());
    expect(shown).toBe(1);
    expect(w.declineOnly()).toBe(0);
  });

  it('googlefc that arrives after the fallback fired does not open a second consent UI', () => {
    const w = pureWindow();
    consent.openConsentChoices(w.target, null, true, w.schedule);
    w.jobs.splice(0).forEach((job) => job.fn());
    let shown = 0;
    (w.target.googlefc as Fc).showRevocationMessage = () => (shown += 1);
    (w.target.googlefc as Fc).callbackQueue?.forEach((fn) => fn());
    expect(w.declineOnly()).toBe(1);
    expect(shown).toBe(0);
  });

  it('EEA/UK/CH, a known country elsewhere and a page without the runtime schedule no fallback (K14-a, K14-b unchanged)', () => {
    for (const [country, cmpAvailable] of [['DE', true], ['GB', true], ['CH', true], ['US', true], ['US', false], ['DE', false], [null, false]] as const) {
      const w = pureWindow();
      (w.target as unknown as { location: { assign: () => void } }).location = { assign: () => undefined };
      consent.openConsentChoices(w.target, country, cmpAvailable, w.schedule);
      expect(w.jobs, `${country} ${cmpAvailable}`).toHaveLength(0);
    }
  });
});

describe('K14-c: the decline-only mode of the consent runtime', () => {
  function harness(country: string | null, stored: 'accepted' | 'declined' | null) {
    const log = { updates: [] as unknown[], writes: [] as string[], visible: [] as Array<[boolean, string | undefined]> };
    const io = {
      country: () => country,
      readStored: () => stored,
      writeStored: (value: string) => void log.writes.push(value),
      update: (state: unknown) => void log.updates.push(state),
      initAnalytics: () => undefined,
      setVisible: (visible: boolean, mode?: string) => void log.visible.push([visible, mode]),
    };
    return { io, log };
  }

  it('the fallback shows the notice in decline-only mode and changes no consent', () => {
    for (const country of [null, 'ZZ']) {
      const { io, log } = harness(country, null);
      consent.runConsentEvent('fallback', io as never);
      expect(log.visible, String(country)).toEqual([[true, 'decline-only']]);
      expect(log.updates).toEqual([]);
      expect(log.writes).toEqual([]);
    }
  });

  it('Decline there sends exactly one denied update, stores the choice and hides the notice; Accept does nothing', () => {
    const { io, log } = harness(null, null);
    consent.runConsentEvent('accept', io as never);
    expect(log.updates).toEqual([]);
    expect(log.writes).toEqual([]);
    consent.runConsentEvent('decline', io as never);
    expect(log.updates).toEqual([DENIED]);
    expect(log.writes).toEqual(['declined']);
    expect(log.visible.every(([visible, mode]) => visible === false && mode === undefined)).toBe(true);
  });

  it('no event ever sends a granted update for an unknown country, and a region never shows the notice', () => {
    for (const stored of [null, 'accepted', 'declined'] as const) {
      for (const event of ['mount', 'reopen', 'accept', 'decline', 'fallback'] as const) {
        const { io, log } = harness(null, stored);
        consent.runConsentEvent(event, io as never);
        expect(log.updates, `${stored} ${event}`).not.toContainEqual(GRANTED);
        for (const country of ['DE', 'GB', 'CH']) {
          const region = harness(country, stored);
          consent.runConsentEvent(event, region.io as never);
          expect(region.log.visible.some(([visible]) => visible), `${country} ${event}`).toBe(false);
          expect(region.log.updates, `${country} ${stored} ${event}`).toEqual([]);
          expect(region.log.writes, `${country} ${stored} ${event}`).toEqual([]);
        }
      }
    }
  });
});

describe('K14-c: the decline-only notice markup', () => {
  it('has one Decline button, the privacy cookie-section link and no Accept; the full notice keeps Accept', async () => {
    const { ConsentNotice } = await import('@/components/common/cookie-consent-banner');
    const only = renderToStaticMarkup(createElement(ConsentNotice, { mode: 'decline-only', onAccept: () => undefined, onDecline: () => undefined }));
    expect(only.match(/<button\b/g)).toHaveLength(1);
    expect(only).toContain('>Decline</button>');
    expect(only).not.toMatch(/Accept/i);
    expect(only).toContain('href="/privacy#4-cookies-and-tracking-technologies"');
    expect(only).toContain('data-consent-mode="decline-only"');
    const full = renderToStaticMarkup(createElement(ConsentNotice, { mode: 'full', onAccept: () => undefined, onDecline: () => undefined }));
    expect(full.match(/<button\b/g)).toHaveLength(2);
    expect(full).toContain('>Accept</button>');
  });

  it('the cookie section the link points to exists on the privacy page', () => {
    const privacy = readFileSync(join(__dirname, '..', '..', 'src', 'app', '(main)', 'privacy', 'page.tsx'), 'utf8');
    expect(privacy).toContain('id="4-cookies-and-tracking-technologies"');
  });
});

describe('K14-c: the real footer link and notice in a browser DOM', () => {
  type Cleanup = () => void;
  const cleanups: Cleanup[] = [];
  afterEach(() => {
    while (cleanups.length) cleanups.pop()?.();
    vi.useRealTimers();
  });

  async function mount(options: { cookie?: string; googlefc?: Fc; cmpAvailable?: boolean }) {
    const win = new Window({ url: 'https://gofirepath.com/' });
    if (options.cookie) win.document.cookie = options.cookie;
    const populated = populateGlobal(globalThis, win, { bindFunctions: true });
    (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
    const gtagCalls: unknown[][] = [];
    (globalThis as Record<string, unknown>).gtag = (...args: unknown[]) => void gtagCalls.push(args);
    if (options.googlefc) (globalThis as Record<string, unknown>).googlefc = options.googlefc;
    vi.useFakeTimers();
    vi.resetModules();
    const { CookieConsentBanner } = await import('@/components/common/cookie-consent-banner');
    const { ManageConsentLink } = await import('@/components/common/manage-consent-link');
    const { createRoot } = await import('react-dom/client');
    const container = win.document.createElement('div');
    win.document.body.appendChild(container);
    const root = createRoot(container as unknown as Element);
    await act(async () => {
      root.render(createElement('div', null, createElement(ManageConsentLink, { cmpAvailable: options.cmpAvailable ?? true }), createElement(CookieConsentBanner)));
    });
    cleanups.push(() => {
      for (const key of populated.keys) {
        delete (globalThis as Record<string, unknown>)[key];
        if (populated.originals.has(key)) (globalThis as Record<string, unknown>)[key] = populated.originals.get(key);
      }
      for (const key of ['window', 'self', 'top', 'parent', 'dataLayer', 'gtag', 'googlefc']) {
        delete (globalThis as Record<string, unknown>)[key];
      }
      delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
    });
    const dialog = () => container.querySelector('[role="dialog"]') as HTMLElement | null;
    const click = async (element: Element | null) => {
      expect(element).not.toBeNull();
      await act(async () => {
        (element as HTMLElement).click();
      });
    };
    const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
    const link = () => container.querySelector('button') as unknown as HTMLElement;
    return { win, container, root, dialog, click, advance, link, gtagCalls, storage: () => win.localStorage.getItem(consent.CONSENT_KEY) };
  }

  it('googlefc absent: nothing for under 2 s, then a decline-only notice with no Accept; Decline sends one denied update and persists it', async () => {
    const page = await mount({});
    await page.click(page.link());
    expect(page.dialog()).toBeNull();
    await page.advance(1900);
    expect(page.dialog()).toBeNull();
    await page.advance(100);
    const dialog = page.dialog();
    expect(dialog, 'the decline-only notice must open').not.toBeNull();
    expect(dialog?.getAttribute('data-consent-mode')).toBe('decline-only');
    const buttons = Array.from(dialog?.querySelectorAll('button') ?? []);
    expect(buttons.map((button) => button.textContent)).toEqual(['Decline']);
    expect(dialog?.textContent ?? '').not.toMatch(/Accept/);
    expect(dialog?.querySelector('a')?.getAttribute('href')).toBe('/privacy#4-cookies-and-tracking-technologies');
    expect(page.gtagCalls).toEqual([]);
    await page.click(buttons[0]);
    expect(page.gtagCalls).toEqual([['consent', 'update', DENIED]]);
    expect(page.storage()).toBe('declined');
    expect(page.dialog()).toBeNull();
    await page.advance(5000);
    expect(page.dialog()).toBeNull();
  });

  it('googlefc ready: Google\'s message opens, our notice never renders and no update is sent', async () => {
    let shown = 0;
    const page = await mount({
      googlefc: {
        showRevocationMessage: () => (shown += 1),
        callbackQueue: { push: (fn: () => void) => fn() } as unknown as Array<() => void>,
      },
    });
    await page.click(page.link());
    await page.advance(5000);
    expect(shown).toBe(1);
    expect(page.dialog()).toBeNull();
    expect(page.gtagCalls).toEqual([]);
  });

  it('googlefc that loads 1 s after the click opens its own message and our notice stays closed', async () => {
    const fc: Fc = {};
    const page = await mount({ googlefc: fc });
    await page.click(page.link());
    await page.advance(1000);
    let shown = 0;
    fc.showRevocationMessage = () => (shown += 1);
    fc.callbackQueue?.forEach((fn) => fn());
    await page.advance(5000);
    expect(shown).toBe(1);
    expect(page.dialog()).toBeNull();
  });

  it('EEA visitor (country cookie DE): the link uses only Google\'s message; our notice never opens', async () => {
    const page = await mount({ cookie: 'visitor_country=DE' });
    await page.click(page.link());
    await page.advance(5000);
    expect(page.dialog()).toBeNull();
    expect(page.gtagCalls).toEqual([]);
  });

  it('known non-EEA visitor (US): the full notice opens at once with Accept and Decline, as before', async () => {
    const page = await mount({ cookie: 'visitor_country=US' });
    await page.click(page.link());
    const dialog = page.dialog();
    expect(dialog?.getAttribute('data-consent-mode')).toBe('full');
    expect(Array.from(dialog?.querySelectorAll('button') ?? []).map((button) => button.textContent)).toEqual(['Decline', 'Accept']);
  });
});
