import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { populateGlobal } from 'vitest/environments';
import { Window } from 'happy-dom';

const GA_ID = 'G-TEST123456';
const MARKER_KEY = 'cc_traffic_type';
const HOME = 'https://gofirepath.com/';

type Cleanup = () => void;
const cleanups: Cleanup[] = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
  vi.unstubAllEnvs();
});

async function configCall(url: string, storage: Record<string, string> = {}): Promise<Record<string, unknown>> {
  vi.stubEnv('NEXT_PUBLIC_GA_MEASUREMENT_ID', GA_ID);
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', 'production');
  vi.stubEnv('NEXT_PUBLIC_GA_DEBUG', '');
  vi.stubEnv('NEXT_PUBLIC_APP_URL', '');
  const win = new Window({ url });
  for (const [key, value] of Object.entries(storage)) win.localStorage.setItem(key, value);
  const populated = populateGlobal(globalThis, win, { bindFunctions: true });
  cleanups.push(() => {
    for (const key of populated.keys) {
      delete (globalThis as Record<string, unknown>)[key];
      if (populated.originals.has(key)) (globalThis as Record<string, unknown>)[key] = populated.originals.get(key);
    }
    for (const key of ['window', 'self', 'top', 'parent', 'dataLayer', 'gtag', '__firepathGaConfigured']) {
      delete (globalThis as Record<string, unknown>)[key];
    }
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  vi.resetModules();
  const { CookieConsentBanner } = await import('@/components/common/cookie-consent-banner');
  const { createRoot } = await import('react-dom/client');
  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(createElement(CookieConsentBanner));
  });
  // populateGlobal makes `window` the Node global, so the app writes dataLayer there
  const dataLayer = (globalThis as unknown as { dataLayer?: unknown[][] }).dataLayer ?? [];
  await act(async () => root.unmount());
  const config = dataLayer.find((entry) => Array.isArray(entry) && entry[0] === 'config');
  expect(config, 'the GA config call must be queued on mount').toBeDefined();
  expect(config?.[1]).toBe(GA_ID);
  return config?.[2] as Record<string, unknown>;
}

describe('W15 (K20/K27): the first GA hit already carries traffic_type=internal for crew visits', () => {
  it('a first visit with ?crew=1 (marker not stored yet) puts traffic_type on the config call that sends page_view', async () => {
    const params = await configCall(`${HOME}?crew=1`);
    expect(params.traffic_type).toBe('internal');
  });

  it('a later visit without ?crew=1 but with the stored marker is still marked', async () => {
    const params = await configCall(HOME, { [MARKER_KEY]: 'internal' });
    expect(params.traffic_type).toBe('internal');
  });

  it('?crew=0 clears the marker for that visit even when one is stored', async () => {
    const params = await configCall(`${HOME}?crew=0`, { [MARKER_KEY]: 'internal' });
    expect(params).not.toHaveProperty('traffic_type');
  });

  it('an ordinary visit is not marked', async () => {
    const params = await configCall(HOME);
    expect(params).not.toHaveProperty('traffic_type');
    expect(params.anonymize_ip).toBe(true);
    expect(params.page_location).toBe(HOME);
  });

  it('the hash-stripped page_location is kept for a marked visit', async () => {
    const params = await configCall(`${HOME}?crew=1#i=abc`);
    expect(params.page_location).toBe(`${HOME}?crew=1`);
    expect(params.traffic_type).toBe('internal');
  });
});
