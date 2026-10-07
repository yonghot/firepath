import { afterEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SeasonBadge } from '@/components/common/season-badge';

const ROOT = join(__dirname, '..', '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const MODULE = '@/lib/data/retirement-limits';
const CONTENT = '@/app/(main)/fire-guide/content';

const badgeText = () => renderToStaticMarkup(createElement(SeasonBadge)).replace(/<[^>]*>/g, '').trim();

const guideStrings = (content: Record<string, unknown>): string[] => {
  const out: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === 'string') out.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === 'object') Object.values(value).forEach(walk);
  };
  walk(content);
  return out;
};

afterEach(() => {
  vi.useRealTimers();
  vi.doUnmock(MODULE);
  vi.resetModules();
});

describe('K31: the season badge is driven by data state, not by the clock', () => {
  it('renders identical text on Nov 15 and Dec 2 2026 and on unrelated dates', () => {
    const texts = ['2026-07-18T12:00:00Z', '2026-11-15T12:00:00Z', '2026-12-02T12:00:00Z', '2027-06-01T12:00:00Z'].map(
      (iso) => {
        vi.useFakeTimers();
        vi.setSystemTime(new Date(iso));
        const text = badgeText();
        vi.useRealTimers();
        return text;
      }
    );
    expect(new Set(texts).size).toBe(1);
  });

  it('says "typically" and names the next unpublished limits year, never a calendar year of announcement', async () => {
    const { getRetirementLimitsState } = await import(MODULE);
    const text = badgeText();
    expect(text).toContain('typically announces');
    expect(text).toContain(`${getRetirementLimitsState().irs.next.year} retirement limits`);
    expect(text).not.toMatch(/Nov 20\d\d/);
    expect(text).toMatch(/October or November/);
  });
});

describe('K31/K4: retirement-limits data module holds published values with sources and nulls for the unpublished year', () => {
  it('2026 Social Security figures carry the values already on the page, their announcement date and source URLs', async () => {
    const { ssa } = (await import(MODULE)).getRetirementLimitsState();
    expect(ssa.current).toMatchObject({ year: 2026, status: 'published' });
    expect(ssa.current.data).toMatchObject({ colaPercent: 2.8, taxableWageBase: 184500, announcedOn: '2025-10-24' });
    expect(ssa.current.data.colaSourceUrl).toMatch(/^https:\/\/www\.ssa\.gov\//);
    expect(ssa.current.data.wageBaseSourceUrl).toMatch(/^https:\/\/www\.ssa\.gov\//);
  });

  it('2026 IRS announcement is recorded with notice number, release number, date and source URL', async () => {
    const { irs } = (await import(MODULE)).getRetirementLimitsState();
    expect(irs.current).toMatchObject({ year: 2026, status: 'published' });
    expect(irs.current.data).toMatchObject({
      noticeNumber: 'Notice 2025-67',
      pressRelease: 'IR-2025-111',
      announcedOn: '2025-11-13',
    });
    expect(irs.current.data.sourceUrl).toMatch(/^https:\/\/www\.irs\.gov\//);
  });

  it('2027 is unpublished for both agencies: null data, no estimate', async () => {
    const { ssa, irs } = (await import(MODULE)).getRetirementLimitsState();
    for (const agency of [ssa, irs]) {
      expect(agency.next).toEqual({ year: 2027, status: 'unpublished', data: null });
    }
  });

  it('state does not move with the clock', async () => {
    const { getRetirementLimitsState } = await import(MODULE);
    const before = JSON.stringify(getRetirementLimitsState());
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2027-01-15T00:00:00Z'));
    expect(JSON.stringify(getRetirementLimitsState())).toBe(before);
  });
});

describe('K31: /fire-guide strings derive from the module', () => {
  it('real module: wording is exactly what the page said before the move', async () => {
    const content = await import(CONTENT);
    const all = guideStrings(content);
    for (const expected of [
      "Social Security's 2026 COLA is 2.8%; the taxable wage base is $184,500",
      'The Social Security Administration announced a 2.8% cost-of-living adjustment for benefits payable starting January 2026 (announced Oct. 24, 2025), and the taxable wage base — the income ceiling for the 12.4% Social Security payroll tax — rose to $184,500.',
      "2026 COLA: 2.8% benefit increase, effective for benefits payable starting January 2026.",
      '2026 taxable wage base: $184,500 — the income ceiling for the 12.4% Social Security payroll tax.',
      'SSA — Social Security Announces 2.8 Percent Benefit Increase for 2026',
      'SSA — Contribution and Benefit Base (2026 taxable wage base $184,500)',
      "Social Security's 2.8% COLA and $184,500 wage base apply to 2026 only; the SSA recalculates both every year — reverify at ssa.gov for any year other than 2026.",
    ]) {
      expect(all.includes(expected), expected).toBe(true);
    }
    expect(all.some((s) => /the cost-of-living adjustment \(COLA\), which raised benefits 2\.8% for 2026, and the taxable wage base \(\$184,500 for 2026\)/.test(s))).toBe(true);
  });

  it('real module: source URLs on the page are the module URLs', async () => {
    const { ssa } = (await import(MODULE)).getRetirementLimitsState();
    const content = await import(CONTENT);
    const urls = (content.GUIDE_SOURCES as { url: string }[]).map((s) => s.url);
    expect(urls).toContain(ssa.current.data.colaSourceUrl);
    expect(urls).toContain(ssa.current.data.wageBaseSourceUrl);
    const fact = (content.GUIDE_FACTS as { fact: string; sourceUrl: string }[]).find((f) => f.fact.includes('COLA'));
    expect(fact?.sourceUrl).toBe(ssa.current.data.colaSourceUrl);
  });

  it('a different published state changes every Social Security string and leaves no 2026 remnant', async () => {
    const actual = await vi.importActual<typeof import('@/lib/data/retirement-limits')>(MODULE);
    const real = actual.getRetirementLimitsState();
    const synthetic = {
      ...real,
      ssa: {
        current: {
          year: 2030,
          status: 'published' as const,
          data: {
            colaPercent: 9.9,
            taxableWageBase: 999999,
            announcedOn: '2030-10-01',
            colaSourceUrl: 'https://www.ssa.gov/test-cola',
            wageBaseSourceUrl: 'https://www.ssa.gov/test-base',
          },
        },
        next: { year: 2031, status: 'unpublished' as const, data: null },
      },
    };
    vi.resetModules();
    vi.doMock(MODULE, async () => ({ ...actual, getRetirementLimitsState: () => synthetic }));
    const content = await import(CONTENT);
    const all = guideStrings(content);
    const joined = all.join('\n');
    expect(joined).toContain('9.9%');
    expect(joined).toContain('$999,999');
    expect(joined).toContain('Oct. 1, 2030');
    expect(joined).toContain('Social Security Announces 9.9 Percent Benefit Increase for 2030');
    expect(joined).not.toContain('2.8%');
    expect(joined).not.toContain('184,500');
    expect(joined).not.toContain('Oct. 24, 2025');
    expect(joined).not.toMatch(/Social Security[^.]*2026|2026 (COLA|taxable wage base)/);
    const urls = (content.GUIDE_SOURCES as { url: string }[]).map((s) => s.url);
    expect(urls).toContain('https://www.ssa.gov/test-cola');
    expect(urls).not.toContain('https://www.ssa.gov/news/en/press/releases/2025-10-24.html');
  });

  it('no string anywhere prints a null gate value', async () => {
    const joined = guideStrings(await import(CONTENT)).join('\n');
    expect(joined).not.toMatch(/\b(null|undefined|NaN)\b/);
  });
});

describe('K31: source guards', () => {
  it('season-badge.tsx reads no clock and takes no `now` prop', () => {
    const src = stripComments(read('src/components/common/season-badge.tsx'));
    expect(src).not.toMatch(/new Date\(|Date\.now\(|getMonth\(|getFullYear\(|\bnow\b/);
    expect(src).toContain('getRetirementLimitsState');
  });

  it('fire-guide/content.ts holds no literal COLA percentage, wage base or SSA announcement date', () => {
    const src = stripComments(read('src/app/(main)/fire-guide/content.ts'));
    expect(src).not.toMatch(/2\.8\b|184,500|184500|Oct\. 24, 2025|2025-10-24/);
    expect(src).toContain('getRetirementLimitsState');
  });

  it('the module holds no clock either', () => {
    const src = stripComments(read('src/lib/data/retirement-limits.ts'));
    expect(src).not.toMatch(/new Date\(\)|Date\.now\(|getFullYear\(/);
  });
});
