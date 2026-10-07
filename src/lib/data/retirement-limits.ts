export interface SsaLimits {
  colaPercent: number;
  taxableWageBase: number;
  announcedOn: string;
  colaSourceUrl: string;
  wageBaseSourceUrl: string;
}

export interface IrsLimits {
  noticeNumber: string;
  pressRelease: string;
  announcedOn: string;
  sourceUrl: string;
}

export interface PublishedYear<T> {
  year: number;
  status: 'published';
  data: T;
}

export interface UnpublishedYear {
  year: number;
  status: 'unpublished';
  data: null;
}

export interface AgencyState<T> {
  current: PublishedYear<T>;
  next: UnpublishedYear;
}

export interface RetirementLimitsState {
  ssa: AgencyState<SsaLimits>;
  irs: AgencyState<IrsLimits>;
}

const SSA_PUBLISHED: Record<number, SsaLimits> = {
  2026: {
    colaPercent: 2.8,
    taxableWageBase: 184500,
    announcedOn: '2025-10-24',
    colaSourceUrl: 'https://www.ssa.gov/news/en/press/releases/2025-10-24.html',
    wageBaseSourceUrl: 'https://www.ssa.gov/oact/cola/cbb.html',
  },
};

const IRS_PUBLISHED: Record<number, IrsLimits> = {
  2026: {
    noticeNumber: 'Notice 2025-67',
    pressRelease: 'IR-2025-111',
    announcedOn: '2025-11-13',
    sourceUrl: 'https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500',
  },
};

function stateOf<T>(published: Record<number, T>): AgencyState<T> {
  const year = Math.max(...Object.keys(published).map(Number));
  return {
    current: { year, status: 'published', data: published[year] },
    next: { year: year + 1, status: 'unpublished', data: null },
  };
}

export function getRetirementLimitsState(): RetirementLimitsState {
  return { ssa: stateOf(SSA_PUBLISHED), irs: stateOf(IRS_PUBLISHED) };
}

const MONTHS = ['Jan.', 'Feb.', 'March', 'April', 'May', 'June', 'July', 'Aug.', 'Sept.', 'Oct.', 'Nov.', 'Dec.'];

export function formatAnnouncedOn(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number);
  return `${MONTHS[month - 1]} ${day}, ${year}`;
}

export function formatDollars(amount: number): string {
  return `$${amount.toLocaleString('en-US')}`;
}
