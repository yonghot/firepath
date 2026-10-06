import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(__dirname, '..', '..');
const KEYS = ['ad_storage', 'ad_user_data', 'ad_personalization', 'analytics_storage'] as const;

function stub() {
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ca-pub-1234567890');
  vi.stubEnv('VERCEL_ENV', 'preview');
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
}

function allKeys(value: string) {
  return Object.fromEntries(KEYS.map((key) => [key, value]));
}

type Storage = { kind: 'none' } | { kind: 'value'; value: string } | { kind: 'throws' } | { kind: 'absent' };

function runDefaultScript(script: string, storage: Storage): unknown[][] {
  const context: Record<string, unknown> = {};
  context.window = context;
  if (storage.kind !== 'absent') {
    context.localStorage = {
      getItem(key: string) {
        if (storage.kind === 'throws') throw new Error('SecurityError');
        if (storage.kind === 'value' && key === 'firepath_cookie_consent') return storage.value;
        return null;
      },
    };
  }
  vm.createContext(context);
  vm.runInContext(script, context);
  const layer = context.dataLayer as ArrayLike<unknown>[];
  return JSON.parse(JSON.stringify(Array.from(layer, (entry) => Array.from(entry))));
}

beforeEach(() => stub());
afterEach(() => vi.unstubAllEnvs());

describe('K14: the consent default is first in the HTML, region-scoped, and honours a stored decline', () => {
  it('renders the default script ahead of the loader, which still has a literal async adsbygoogle tag', async () => {
    const { ConsentDefault } = await import('@/components/ads/consent-default');
    const { AdLoader } = await import('@/components/ads/ad-loader');
    const html = renderToString(
      createElement(
        'html',
        null,
        createElement('head', null, createElement(ConsentDefault)),
        createElement('body', null, createElement(AdLoader)),
      ),
    );
    const defaultAt = html.indexOf("gtag('consent','default'");
    const loaderAt = html.indexOf('adsbygoogle.js');
    expect(defaultAt).toBeGreaterThan(-1);
    expect(loaderAt).toBeGreaterThan(-1);
    expect(defaultAt, 'consent default must precede the loader in the served HTML').toBeLessThan(loaderAt);
    expect(html).toMatch(
      /<script id="adsense-loader" async="" crossorigin="anonymous" src="https:\/\/pagead2\.googlesyndication\.com\/pagead\/js\/adsbygoogle\.js\?client=ca-pub-1234567890"/,
    );
  });

  it('the root layout renders ConsentDefault inside <head> and no longer inlines its own default', () => {
    const layout = readFileSync(join(ROOT, 'src', 'app', 'layout.tsx'), 'utf8');
    expect(layout).toMatch(/<head>[\s\S]*<ConsentDefault\s*\/>[\s\S]*<\/head>/);
    expect(layout).not.toMatch(/gtag\('consent'/);
  });

  it('keeps one 32-code EEA+UK+CH list that the cookie banner imports instead of redefining', async () => {
    const { EEA_UK_CH } = await import('@/lib/consent');
    expect(EEA_UK_CH).toHaveLength(32);
    expect(new Set(EEA_UK_CH).size).toBe(32);
    for (const code of EEA_UK_CH) expect(code).toMatch(/^[A-Z]{2}$/);
    for (const code of ['DE', 'FR', 'GB', 'CH', 'IS', 'LI', 'NO', 'IE', 'PL']) expect(EEA_UK_CH).toContain(code);
    const banner = readFileSync(join(ROOT, 'src', 'components', 'common', 'cookie-consent-banner.tsx'), 'utf8');
    expect(banner).toMatch(/from '@\/lib\/consent'/);
    expect(banner).not.toMatch(/'AT',\s*'BE'/);
  });

  describe('the default script, evaluated as a browser would', () => {
    const none: Storage = { kind: 'none' };

    async function expectedEntries(globalValue: 'granted' | 'denied') {
      const { EEA_UK_CH } = await import('@/lib/consent');
      return [
        ['consent', 'default', { ...allKeys('denied'), region: [...EEA_UK_CH], wait_for_update: 500 }],
        ['consent', 'default', allKeys(globalValue)],
      ];
    }

    it.each([
      { label: 'no stored choice', storage: none, globalValue: 'granted' },
      { label: 'stored accepted', storage: { kind: 'value', value: 'accepted' } as Storage, globalValue: 'granted' },
      { label: 'stored declined', storage: { kind: 'value', value: 'declined' } as Storage, globalValue: 'denied' },
      { label: 'storage that throws', storage: { kind: 'throws' } as Storage, globalValue: 'granted' },
      { label: 'no localStorage at all', storage: { kind: 'absent' } as Storage, globalValue: 'granted' },
    ] as const)('$label: denied region default first, then the global default is $globalValue', async ({ storage, globalValue }) => {
      const { buildConsentDefaultScript } = await import('@/lib/consent');
      const entries = runDefaultScript(buildConsentDefaultScript(), storage);
      expect(entries).toEqual(await expectedEntries(globalValue));
    });

    it('defines a global gtag and a dataLayer other scripts can reuse', async () => {
      const { buildConsentDefaultScript } = await import('@/lib/consent');
      const context: Record<string, unknown> = { localStorage: { getItem: () => null } };
      context.window = context;
      vm.createContext(context);
      vm.runInContext(buildConsentDefaultScript(), context);
      expect(typeof context.gtag).toBe('function');
      expect(Array.isArray(context.dataLayer)).toBe(true);
    });
  });
});
