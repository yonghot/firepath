import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderThenHydrate, type PageUnderTest } from './helpers/hydrate';

const FIXTURES = '@/../tests/regressions/helpers/fixtures';

const fixture = (file: string, name: string) => async (): Promise<PageUnderTest> => {
  const mod = (await import(/* @vite-ignore */ `${FIXTURES}/${file}`)) as Record<string, never>;
  return { tree: createElement(mod[name]), serverComponents: [] };
};

const BUILD = new Date('2026-08-31T12:00:00Z');
const browser = { now: new Date('2026-10-08T00:10:00Z'), timeZone: 'America/New_York', locale: 'de-DE', storage: {} };

describe('the hydration harness detects the mismatch classes it claims to detect (positive controls)', () => {
  it('a client date formatted in the visitor time zone differs from the UTC server render', async () => {
    const report = await renderThenHydrate(fixture('zone-sensitive-date', 'ZoneSensitiveDate'), BUILD, browser);
    expect(report.problems.join('\n')).toMatch(/Hydration failed because the server rendered text didn't match/);
  }, 120_000);

  it('a client module that formats a number in the browser default locale differs from the server render', async () => {
    const report = await renderThenHydrate(fixture('locale-sensitive-number', 'LocaleSensitiveNumber'), BUILD, browser);
    expect(report.problems.join('\n')).toMatch(/Hydration failed because the server rendered text didn't match/);
  }, 120_000);

  it('a render that branches on window differs from the server render', async () => {
    const report = await renderThenHydrate(fixture('window-branch', 'WindowBranch'), BUILD, browser);
    expect(report.problems.join('\n')).toMatch(/Hydration failed because the server rendered text didn't match/);
  }, 120_000);

  it('a component that formats in UTC and en-US hydrates cleanly under the same hostile browser', async () => {
    const report = await renderThenHydrate(fixture('stable', 'Stable'), BUILD, browser);
    expect(report.problems).toEqual([]);
  }, 120_000);
});
