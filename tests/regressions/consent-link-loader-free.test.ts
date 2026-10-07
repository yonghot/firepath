import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as consent from '@/lib/consent';
import { ManageConsentLink } from '@/components/common/manage-consent-link';

const ROOT = join(__dirname, '..', '..');
const APP = join(ROOT, 'src', 'app');
const stripComments = (source: string) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
const read = (file: string) => stripComments(readFileSync(file, 'utf8'));

type Win = EventTarget & {
  googlefc?: { callbackQueue?: Array<() => void> };
  location?: { assign: (url: string) => void };
};

function fakeWindow() {
  const target = new EventTarget() as Win;
  const assign = vi.fn();
  target.location = { assign };
  let reopened = 0;
  target.addEventListener(consent.REOPEN_CONSENT_EVENT, () => {
    reopened += 1;
  });
  return { target, assign, reopened: () => reopened };
}

afterEach(() => vi.unstubAllGlobals());

describe('K14-b: the footer "Manage consent" link does something on every page', () => {
  it('EEA/UK/CH visitors on a page without the Google consent runtime are sent to the privacy section, not to an inert queue', () => {
    for (const country of ['DE', 'GB', 'CH']) {
      const { target, assign, reopened } = fakeWindow();
      expect(consent.openConsentChoices(target, country, false), country).toBe('privacy');
      expect(assign).toHaveBeenCalledExactlyOnceWith('/privacy#4-cookies-and-tracking-technologies');
      expect(target.googlefc, country).toBeUndefined();
      expect(reopened(), country).toBe(0);
    }
  });

  it('the destination is a heading that exists on a page that carries the runtime', () => {
    const privacy = readFileSync(join(APP, '(main)', 'privacy', 'page.tsx'), 'utf8');
    expect(privacy).toContain('id="4-cookies-and-tracking-technologies"');
  });

  it('where the runtime is present the EEA click still queues showRevocationMessage', () => {
    const { target, assign } = fakeWindow();
    expect(consent.openConsentChoices(target, 'FR', true)).toBe('cmp');
    expect(target.googlefc?.callbackQueue).toHaveLength(1);
    expect(assign).not.toHaveBeenCalled();
  });

  it('outside EEA/UK/CH our own notice opens whether or not the runtime is present', () => {
    for (const cmpAvailable of [true, false]) {
      const { target, assign, reopened } = fakeWindow();
      expect(consent.openConsentChoices(target, 'US', cmpAvailable)).toBe('banner');
      expect(reopened()).toBe(1);
      expect(assign).not.toHaveBeenCalled();
    }
  });

  it('the link component passes its page\'s runtime availability on to the click handler', () => {
    for (const [cmpAvailable, expectNavigation] of [
      [false, true],
      [true, false],
    ] as const) {
      const { target, assign } = fakeWindow();
      vi.stubGlobal('window', target);
      vi.stubGlobal('document', { cookie: 'visitor_country=DE' });
      const button = ManageConsentLink({ cmpAvailable }) as unknown as { props: { onClick: () => void } };
      button.props.onClick();
      expect(assign.mock.calls.length > 0, `cmpAvailable=${cmpAvailable}`).toBe(expectNavigation);
      expect(Boolean(target.googlefc?.callbackQueue?.length), `cmpAvailable=${cmpAvailable}`).toBe(!expectNavigation);
      vi.unstubAllGlobals();
    }
  });
});

describe('K14-b: only the layouts that mount the ad loader tell the footer the consent runtime exists', () => {
  function layouts(dir: string, out: string[] = []): string[] {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        if (name !== '__tests__' && name !== 'api') layouts(full, out);
      } else if (name === 'layout.tsx') {
        out.push(full);
      }
    }
    return out;
  }

  const chromeLayouts = layouts(APP).filter((file) => /<SiteChrome\b/.test(read(file)));

  it('finds the two chrome layouts', () => {
    expect(chromeLayouts.map((file) => file.slice(APP.length + 1).replace(/\\/g, '/')).sort()).toEqual([
      '(main)/layout.tsx',
      '(utility)/layout.tsx',
    ]);
  });

  it('a layout passes cmpAvailable to the chrome exactly when it mounts the loader', () => {
    for (const file of chromeLayouts) {
      const source = read(file);
      const mountsLoader = /<AdLoader\b/.test(source);
      const passesFlag = /<SiteChrome\b[^>]*\bcmpAvailable\b/.test(source);
      expect(passesFlag, file).toBe(mountsLoader);
    }
  });

  it('the flag travels chrome -> footer -> link and defaults to "not available"', () => {
    const chrome = read(join(ROOT, 'src', 'components', 'layouts', 'site-chrome.tsx'));
    const footer = read(join(ROOT, 'src', 'components', 'layouts', 'footer.tsx'));
    expect(chrome).toMatch(/cmpAvailable\s*=\s*false/);
    expect(chrome).toMatch(/<Footer\b[^>]*cmpAvailable=\{cmpAvailable\}/);
    expect(footer).toMatch(/cmpAvailable\s*=\s*false/);
    expect(footer).toMatch(/<ManageConsentLink\b[^>]*cmpAvailable=\{cmpAvailable\}/);
  });
});
