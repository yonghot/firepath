import { describe, expect, it, vi } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { GUIDE_SOURCES } from '@/app/(main)/fire-guide/content';
import { metadata as guideMetadata } from '@/app/(main)/fire-guide/page';
import { formatCurrencyFull } from '@/lib/utils/format';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

await preloadPages();

const SRC = path.resolve(__dirname, '../../src');
const ROOT = path.resolve(__dirname, '../..');

const decode = (value: string) =>
  value.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&quot;/g, '"').replace(/&nbsp;/g, ' ');

function visibleText(html: string): string {
  return decode(
    html
      .replace(/<script[\s\S]*?<\/script>/g, ' ')
      .replace(/<style[\s\S]*?<\/style>/g, ' ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/\s+/g, ' ')
    .trim();
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\./.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const rendered: Record<string, string> = {};
for (const route of Object.keys(PAGE_LOADERS)) rendered[route] = await renderPage(route);

describe('FIRE-26 (K4): healthcare-bridge figures and citations', () => {
  const html = rendered['/healthcare-bridge'];
  const text = visibleText(html);

  it('every 1.44x multiple is preceded by "about" (the real ratio is 1.4386)', () => {
    const matches = [...text.matchAll(/(\S+)\s+1\.44\s?[×x]/g)];
    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) expect(match[1].toLowerCase()).toBe('about');
  });

  it('the 5% premium growth is an adjustable assumption, not a KFF finding', () => {
    expect(text).toMatch(/adjustable assumption/i);
    expect(text).not.toMatch(/KFF[- ]reported|per KFF|KFF 2023|historically ~?5|roughly 5%\/yr|found roughly/i);
  });

  it('cites the current Medicare.gov page and a §226 link that really is §226', () => {
    expect(html).toContain('https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start');
    expect(html).not.toContain('get-started-with-medicare/when-does-medicare-coverage-start');
    const anchors = [...html.matchAll(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].filter((m) => /§226/.test(visibleText(m[2])));
    expect(anchors.length).toBeGreaterThanOrEqual(3);
    for (const [, href] of anchors) expect(href).toContain('USCODE-2023-title42-chap7-subchapII-sec426');
  });

  it('cites the 2025 KFF survey as context, not the 2023 edition', () => {
    expect(html).toContain('https://www.kff.org/health-costs/2025-employer-health-benefits-survey/');
    expect(html).not.toContain('2023-employer-health-benefits-survey');
  });
});

describe('FIRE-26 (K4): multipliers are labelled as FIREPath modelling choices', () => {
  const text = visibleText(rendered['/fire-types']);

  it('the methodology note and the FAQ say the percentages are FIREPath\'s own, fixed choices', () => {
    expect(text).not.toMatch(/sourced from published FIRE literature|widely used defaults/i);
    expect(text.match(/FIREPath's own modelling choices/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });
});

describe('FIRE-26 (K4): counts and assumptions stated on the page match the data', () => {
  it('the source count in the /fire-guide description equals the list length, and no source file claims a different count', () => {
    expect(String(guideMetadata.description)).toContain(`${GUIDE_SOURCES.length} cited sources`);
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, 'utf8');
      for (const match of code.matchAll(/\b(\d+)\s+(?:cited\s+|official\s+|primary\s+)*sources\b/gi)) {
        const claimed = Number(match[1]);
        if (claimed !== GUIDE_SOURCES.length) offenders.push(`${path.relative(SRC, file)}: "${match[0]}"`);
        if (/official/i.test(match[0])) offenders.push(`${path.relative(SRC, file)}: "${match[0]}" calls the list official`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('the savings-rate table says which starting net worth, inflation and withdrawal rate it assumes', () => {
    const text = visibleText(rendered['/fire-guide']);
    expect(text).toContain(`starting net worth of ${formatCurrencyFull(DEFAULT_INPUT.currentNetWorth)}`);
    expect(text).toMatch(/3\.0% inflation/);
    expect(text).toMatch(/4\.0% safe withdrawal rate/);
  });
});

describe('FIRE-26 (K4): no known-dead or mislabelled citation URL ships', () => {
  const DEAD = [
    'get-started-with-medicare/when-does-medicare-coverage-start',
    'ssa.gov/OP_Home/ssact/title18/1836.htm',
    '2023-employer-health-benefits-survey',
  ];

  it('is absent from every source file and the rendered pages', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const code = readFileSync(file, 'utf8');
      for (const dead of DEAD) {
        const clean = dead === DEAD[0] ? code.replaceAll('sign-up/when-does-medicare-coverage-start', '') : code;
        if (clean.includes(dead)) offenders.push(`${path.relative(SRC, file)}: ${dead}`);
      }
    }
    for (const [route, html] of Object.entries(rendered)) {
      for (const dead of DEAD.slice(1)) if (html.includes(dead)) offenders.push(`${route}: ${dead}`);
    }
    expect(offenders).toEqual([]);
  });

  it('docs/source-checks.md records each URL that was read, with the retrieval date', () => {
    const doc = readFileSync(path.join(ROOT, 'docs/source-checks.md'), 'utf8');
    for (const url of [
      'https://www.medicare.gov/basics/get-started-with-medicare/sign-up/when-does-medicare-coverage-start',
      'https://www.govinfo.gov/content/pkg/USCODE-2023-title42/html/USCODE-2023-title42-chap7-subchapII-sec426.htm',
      'https://www.kff.org/health-costs/2025-employer-health-benefits-survey/',
    ]) {
      const row = doc.split('\n').find((line) => line.includes(url));
      expect(row, url).toBeDefined();
      expect(row).toMatch(/2026-10-07/);
    }
  });
});
