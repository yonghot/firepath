import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as consent from '@/lib/consent';

const ROOT = join(__dirname, '..', '..');
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const read = (file: string) => stripComments(readFileSync(join(ROOT, file), 'utf8'));

const KEYS = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'] as const;
const state = (value: 'granted' | 'denied') => Object.fromEntries(KEYS.map((key) => [key, value]));
const GRANTED = state('granted');
const DENIED = state('denied');

type Choice = 'accepted' | 'declined' | null;

function harness(country: string | null, stored: Choice) {
  const log = {
    updates: [] as unknown[],
    writes: [] as string[],
    visible: [] as boolean[],
    analytics: 0,
  };
  let current = stored;
  const io = {
    country: () => country,
    readStored: () => current,
    writeStored: (value: 'accepted' | 'declined') => {
      current = value;
      log.writes.push(value);
    },
    update: (next: unknown) => log.updates.push(next),
    initAnalytics: () => {
      log.analytics += 1;
    },
    setVisible: (value: boolean) => log.visible.push(value),
  };
  return { io, log, stored: () => current };
}

const OUTSIDE = [
  ['US', 'US'],
  ['unknown ZZ', 'ZZ'],
  ['no country cookie', null],
] as const;
const REGIONS = ['DE', 'GB', 'CH'] as const;
const CHOICES: Choice[] = [null, 'accepted', 'declined'];

describe('K14/K14-a/K14-b: consent runtime', () => {
  describe('outside EEA/UK/CH', () => {
    for (const [label, country] of OUTSIDE) {
      it(`${label}, nothing stored: no update, no banner, analytics initialised`, () => {
        const { io, log } = harness(country, null);
        consent.runConsentEvent('mount', io);
        expect(log.updates).toEqual([]);
        expect(log.visible).toEqual([]);
        expect(log.writes).toEqual([]);
        expect(log.analytics).toBe(1);
      });

      it(`${label}, stored accepted: nothing is granted on load (the default already is), no banner`, () => {
        const { io, log } = harness(country, 'accepted');
        consent.runConsentEvent('mount', io);
        expect(log.updates).toEqual([]);
        expect(log.visible).toEqual([]);
        expect(log.analytics).toBe(1);
      });

      it(`${label}, stored declined: update(denied) on every mount, no banner`, () => {
        const { io, log } = harness(country, 'declined');
        consent.runConsentEvent('mount', io);
        expect(log.updates).toEqual([DENIED]);
        expect(log.visible).toEqual([]);
        expect(log.analytics).toBe(1);
      });
    }

    it('reopen from the footer shows the banner and changes no consent', () => {
      const { io, log } = harness('US', null);
      consent.runConsentEvent('reopen', io);
      expect(log.visible).toEqual([true]);
      expect(log.updates).toEqual([]);
      expect(log.writes).toEqual([]);
    });

    it('Accept sends update(granted), stores the choice and hides the banner', () => {
      const { io, log, stored } = harness('US', null);
      consent.runConsentEvent('accept', io);
      expect(log.updates).toEqual([GRANTED]);
      expect(log.writes).toEqual(['accepted']);
      expect(log.visible).toEqual([false]);
      expect(stored()).toBe('accepted');
    });

    it('Decline sends update(denied) immediately, stores the choice and hides the banner', () => {
      const { io, log, stored } = harness('US', 'accepted');
      consent.runConsentEvent('decline', io);
      expect(log.updates).toEqual([DENIED]);
      expect(log.writes).toEqual(['declined']);
      expect(log.visible).toEqual([false]);
      expect(stored()).toBe('declined');
    });

    it('decline, then a later visit: the stored decline is re-applied from the first mount', () => {
      const first = harness('US', null);
      consent.runConsentEvent('decline', first.io);
      const revisit = harness('US', first.stored());
      consent.runConsentEvent('mount', revisit.io);
      expect(revisit.log.updates).toEqual([DENIED]);
    });

    it('re-deciding after a reopen replaces the stored choice only on the new click', () => {
      const { io, log, stored } = harness('US', 'declined');
      consent.runConsentEvent('reopen', io);
      expect(stored()).toBe('declined');
      consent.runConsentEvent('accept', io);
      expect(stored()).toBe('accepted');
      expect(log.updates).toEqual([GRANTED]);
    });
  });

  describe('inside EEA/UK/CH (Google CMP is the only consent UI)', () => {
    for (const country of REGIONS) {
      for (const stored of CHOICES) {
        it(`${country}, stored ${stored}: banner never renders, no update is sent, stored value ignored, analytics initialised`, () => {
          const { io, log } = harness(country, stored);
          consent.runConsentEvent('mount', io);
          expect(log.updates).toEqual([]);
          expect(log.visible.includes(true)).toBe(false);
          expect(log.writes).toEqual([]);
          expect(log.analytics).toBe(1);
        });
      }
    }

    it('a reopen event never shows our banner and Accept/Decline never reach Google or storage', () => {
      for (const country of REGIONS) {
        const { io, log } = harness(country, null);
        for (const event of ['reopen', 'accept', 'decline'] as const) consent.runConsentEvent(event, io);
        expect(log.visible.includes(true), country).toBe(false);
        expect(log.updates, country).toEqual([]);
        expect(log.writes, country).toEqual([]);
      }
    });

    it('no event for any region code ever sends update(granted)', () => {
      for (const country of consent.EEA_UK_CH) {
        for (const stored of CHOICES) {
          for (const event of ['mount', 'reopen', 'accept', 'decline'] as const) {
            const { io, log } = harness(country, stored);
            consent.runConsentEvent(event, io);
            expect(log.updates, `${country} ${stored} ${event}`).not.toContainEqual(GRANTED);
          }
        }
      }
    });

    it('lower-case country values are treated the same way', () => {
      const { io, log } = harness('de', 'accepted');
      consent.runConsentEvent('mount', io);
      expect(log.updates).toEqual([]);
    });
  });

  describe('footer "Manage consent" link', () => {
    function fakeWindow() {
      const target = new EventTarget() as EventTarget & { googlefc?: { callbackQueue?: Array<() => void>; showRevocationMessage?: () => void } };
      let reopened = 0;
      target.addEventListener(consent.REOPEN_CONSENT_EVENT, () => {
        reopened += 1;
      });
      return { target, reopened: () => reopened };
    }

    it('in EEA/UK/CH it queues showRevocationMessage on googlefc and does not open our banner', () => {
      for (const country of REGIONS) {
        const { target, reopened } = fakeWindow();
        expect(consent.openConsentChoices(target, country, true)).toBe('cmp');
        expect(reopened()).toBe(0);
        const queue = target.googlefc?.callbackQueue;
        expect(queue).toHaveLength(1);
        let shown = 0;
        (target.googlefc as { showRevocationMessage?: () => void }).showRevocationMessage = () => {
          shown += 1;
        };
        (queue as Array<() => void>)[0]();
        expect(shown).toBe(1);
      }
    });

    it('keeps an existing googlefc queue instead of replacing it', () => {
      const { target } = fakeWindow();
      const existing = () => undefined;
      target.googlefc = { callbackQueue: [existing] };
      consent.openConsentChoices(target, 'FR', true);
      expect(target.googlefc.callbackQueue).toHaveLength(2);
      expect(target.googlefc.callbackQueue?.[0]).toBe(existing);
    });

    it('in a known country outside the regions it dispatches the reopen event for our banner and leaves googlefc alone', () => {
      for (const country of ['US', 'CA', 'us']) {
        const { target, reopened } = fakeWindow();
        expect(consent.openConsentChoices(target, country, true)).toBe('banner');
        expect(reopened()).toBe(1);
        expect(target.googlefc).toBeUndefined();
      }
    });

    it('with no usable country (no cookie, ZZ, XX, T1, junk) it queues the Google CMP like EEA/UK/CH and never opens our banner (K13-R(12))', () => {
      for (const country of [null, undefined, '', 'ZZ', 'zz', 'XX', 'T1', 'USA', '1']) {
        const { target, reopened } = fakeWindow();
        expect(consent.openConsentChoices(target, country, true), String(country)).toBe('cmp');
        expect(reopened(), String(country)).toBe(0);
        const queue = target.googlefc?.callbackQueue;
        expect(queue, String(country)).toHaveLength(1);
        let shown = 0;
        (target.googlefc as { showRevocationMessage?: () => void }).showRevocationMessage = () => {
          shown += 1;
        };
        (queue as Array<() => void>)[0]();
        expect(shown, String(country)).toBe(1);
      }
    });

    it('a country that is neither known nor in a region never reaches our banner through any event, so no granted update can be sent', () => {
      for (const country of [null, 'ZZ', 'XX']) {
        const { io, log } = harness(country, null);
        for (const event of ['reopen', 'accept', 'decline'] as const) consent.runConsentEvent(event, io);
        expect(log.visible.includes(true), String(country)).toBe(false);
        expect(log.updates, String(country)).toEqual([]);
        expect(log.writes, String(country)).toEqual([]);
      }
    });
  });

  describe('component sources', () => {
    const banner = read('src/components/common/cookie-consent-banner.tsx');
    const link = read('src/components/common/manage-consent-link.tsx');

    it('the banner never grants on load and never shows itself outside the reopen path', () => {
      expect(banner).not.toMatch(/grantAll/);
      expect(banner).not.toMatch(/setDecision/);
      expect(banner).not.toMatch(/setVisible\(\s*true\s*\)/);
      expect(banner).toMatch(/runConsentEvent\('mount'/);
      expect(banner.match(/runConsentEvent\('reopen'/g)).toHaveLength(1);
      expect(banner).toMatch(/addEventListener\(REOPEN_CONSENT_EVENT/);
    });

    it('the banner still initialises analytics on mount in every region and keeps its copy', () => {
      expect(banner).toMatch(/initAnalytics:\s*initGA/);
      expect(banner).toContain('Decline');
      expect(banner).toContain('Accept');
    });

    it('the footer link no longer clears the stored choice and routes through openConsentChoices', () => {
      expect(link).not.toMatch(/removeItem/);
      expect(link).toMatch(/openConsentChoices\(/);
      expect(link).toContain('Do Not Sell or Share My Personal Information / Manage Consent');
    });
  });
});
