import { describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { renderThenHydrate, type BrowserState, type PageUnderTest } from './helpers/hydrate';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const BUILD_TIME = new Date('2026-08-31T12:00:00Z');
const VISIT_TIME = new Date('2026-10-08T00:10:00Z');

const RETURNING_VISITOR: Record<string, string> = {
  firepath_terms_consent: JSON.stringify({ accepted: true, timestamp: '2026-10-01T00:00:00.000Z' }),
  cc_state_fire_timeline: JSON.stringify({
    schema: 1,
    savedAt: '2026-10-01T00:00:00.000Z',
    data: { ...DEFAULT_INPUT, currentAge: 41, annualIncome: 120000 },
  }),
  cc_recent: JSON.stringify([{ calcType: 'fire_timeline', savedAt: '2026-10-01T00:00:00.000Z', path: '/' }]),
  firepath_cookie_consent: 'declined',
};

async function home(): Promise<PageUnderTest> {
  const { Providers } = await import('@/components/providers');
  const MainLayout = (await import('@/app/(main)/layout')).default;
  const Page = (await import('@/app/(main)/page')).default;
  const page = (await Page()) as ReactNode;
  return {
    tree: createElement(Providers, null, createElement(MainLayout, null, page)),
    serverComponents: [MainLayout as never, Page as never],
  };
}

function firstRender(browser: Partial<BrowserState>, serverNow: Date = BUILD_TIME) {
  return renderThenHydrate(home, serverNow, { now: VISIT_TIME, timeZone: 'America/New_York', ...browser });
}

describe('hydration of the home page: the first client render equals the server HTML (React error 418)', () => {
  it('first visit, empty storage, default locale, the visit is the day the page was built', async () => {
    expect((await firstRender({ storage: {} }, VISIT_TIME)).problems).toEqual([]);
  }, 120_000);

  it('first visit from a time zone behind UTC, where an ISO date at midnight UTC is still the previous day', async () => {
    expect((await firstRender({ storage: {}, timeZone: 'Pacific/Honolulu' }, VISIT_TIME)).problems).toEqual([]);
  }, 120_000);

  it('first visit weeks after the page was built', async () => {
    expect((await firstRender({ storage: {} })).problems).toEqual([]);
  }, 120_000);

  it('first visit in a browser whose default locale is not en-US', async () => {
    expect((await firstRender({ storage: {}, locale: 'de-DE' })).problems).toEqual([]);
  }, 120_000);

  it('first visit in a browser that formats numbers with other digits', async () => {
    expect((await firstRender({ storage: {}, locale: 'ar-EG' })).problems).toEqual([]);
  }, 120_000);

  it('returning visitor with consent, a saved scenario, a recent-calculations entry and a stored cookie choice', async () => {
    expect((await firstRender({ storage: RETURNING_VISITOR, locale: 'de-DE' })).problems).toEqual([]);
  }, 120_000);

  it('share-link visitor whose address bar carries a scenario hash', async () => {
    const report = await firstRender({ storage: {}, url: 'https://gofirepath.com/#a=41&i=120000&sr=0.25' });
    expect(report.problems).toEqual([]);
  }, 120_000);

  it('page cached across New Year: built in December, hydrated in January', async () => {
    const report = await firstRender({ storage: {}, now: new Date('2027-01-02T09:00:00Z') }, new Date('2026-12-31T23:30:00Z'));
    expect(report.problems).toEqual([]);
  }, 120_000);
});
