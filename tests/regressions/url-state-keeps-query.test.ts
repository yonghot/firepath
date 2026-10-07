import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, createElement } from 'react';
import { populateGlobal } from 'vitest/environments';
import { Window } from 'happy-dom';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { encodeState } from '@/lib/engine/url-state';

const LANDING = 'https://gofirepath.com/?crew=1&utm_source=newsletter&gclid=abc';

const cleanups: Array<() => void> = [];

afterEach(() => {
  while (cleanups.length) cleanups.pop()?.();
});

async function mountAt(url: string) {
  const win = new Window({ url });
  const populated = populateGlobal(globalThis, win, { bindFunctions: true });
  cleanups.push(() => {
    for (const key of populated.keys) {
      delete (globalThis as Record<string, unknown>)[key];
      if (populated.originals.has(key)) (globalThis as Record<string, unknown>)[key] = populated.originals.get(key);
    }
    for (const key of ['window', 'self', 'top', 'parent']) delete (globalThis as Record<string, unknown>)[key];
    delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT;
  });
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

  vi.resetModules();
  const { useUrlState } = await import('@/hooks/use-url-state');
  const { useCalculatorStore } = await import('@/stores/calculator.store');
  const { createRoot } = await import('react-dom/client');
  function Probe() {
    useUrlState();
    return null;
  }
  const container = win.document.createElement('div');
  win.document.body.appendChild(container);
  const root = createRoot(container as unknown as Element);
  await act(async () => {
    root.render(createElement(Probe));
  });
  cleanups.push(() => act(() => root.unmount()));
  return { win, store: useCalculatorStore };
}

describe('K20: the URL-state hook never drops the query string GA reads as page_location', () => {
  it('at the default inputs the mount keeps ?crew, utm_* and gclid (live / lost them before GA config)', async () => {
    const { win } = await mountAt(LANDING);
    expect(win.location.href).toBe(LANDING);
  });

  it('a changed input writes the share hash after the query', async () => {
    const { win, store } = await mountAt(LANDING);
    const own = { ...DEFAULT_INPUT, currentAge: 41 };
    await act(async () => {
      store.getState().setInput(own);
    });
    expect(win.location.search).toBe('?crew=1&utm_source=newsletter&gclid=abc');
    expect(win.location.hash).toBe(`#${encodeState(own)}`);
  });

  it('restoring the share state after an in-page anchor keeps the query', async () => {
    const { win } = await mountAt(LANDING);
    await act(async () => {
      win.location.hash = '#results-disclaimer';
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(win.location.search).toBe('?crew=1&utm_source=newsletter&gclid=abc');
    expect(win.location.hash).toBe('');
  });
});
