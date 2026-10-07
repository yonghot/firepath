import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderThenHydrate, type PageUnderTest } from './helpers/hydrate';

const FIXTURES = '@/../tests/regressions/helpers/fixtures';

const clientIsoDates = (only?: string) => async (): Promise<PageUnderTest> => {
  const mod = (await import(/* @vite-ignore */ `${FIXTURES}/client-iso-dates`)) as Record<string, never>;
  return { tree: createElement(mod.ClientIsoDates, { only }), serverComponents: [] };
};

const BUILD = new Date('2026-08-31T12:00:00Z');
const VISIT = new Date('2026-10-08T00:10:00Z');

describe('ISO dates rendered by client components (React #418 on the live home page, build d91a670)', () => {
  it.each(['America/New_York', 'America/Los_Angeles', 'Pacific/Honolulu', 'Europe/Berlin', 'Asia/Kolkata', 'Pacific/Auckland'])(
    'ResultDisclaimer, AnswerBlock and AuthorByline hydrate the UTC server markup unchanged for a visitor in %s',
    async (timeZone) => {
      const report = await renderThenHydrate(clientIsoDates(), BUILD, { now: VISIT, timeZone, storage: {} });
      expect(report.problems).toEqual([]);
    },
    120_000,
  );

  it.each(['disclaimer', 'answer', 'byline'])(
    'the %s component alone hydrates the UTC server markup unchanged for a visitor in America/New_York',
    async (only) => {
      const report = await renderThenHydrate(clientIsoDates(only), BUILD, { now: VISIT, timeZone: 'America/New_York', storage: {} });
      expect(report.problems).toEqual([]);
    },
    120_000,
  );

  it('a visitor west of UTC still reads the registry date, never the previous day', async () => {
    const report = await renderThenHydrate(clientIsoDates(), BUILD, { now: VISIT, timeZone: 'America/Los_Angeles', storage: {} });
    expect(report.hydratedHtml.match(/June 29, 2026/g)).toHaveLength(3);
    expect(report.hydratedHtml).not.toMatch(/June 28, 2026/);
  }, 120_000);
});
