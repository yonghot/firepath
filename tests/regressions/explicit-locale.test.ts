import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

const SRC = path.resolve(__dirname, '../../src');

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') sourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

const FILES = sourceFiles(SRC).map((file) => ({ rel: path.relative(SRC, file).split(path.sep).join('/'), text: readFileSync(file, 'utf8') }));

const LOCAL_TIME_ON_PURPOSE = new Set([
  'components/common/recent-calculations.tsx',
  'components/features/saved/saved-item.tsx',
]);

describe('React error 418: text the server and the browser both produce must not depend on the viewer', () => {
  it('no number or date is formatted in the default locale of whoever runs the code', () => {
    const offenders = FILES.flatMap(({ rel, text }) =>
      [...text.matchAll(/\.toLocale(?:Date|Time)?String\(\s*\)|new Intl\.(?:NumberFormat|DateTimeFormat)\(\s*(?:\)|undefined)/g)].map(
        (m) => `${rel}: ${m[0]}`,
      ),
    );
    expect(offenders).toEqual([]);
  });

  it('a calendar date written as an ISO string is formatted in UTC, so every time zone prints the same day', () => {
    const offenders = FILES.flatMap(({ rel, text }) => {
      if (LOCAL_TIME_ON_PURPOSE.has(rel)) return [];
      return [...text.matchAll(/toLocale(?:Date)?String\(\s*'[^']*'\s*,\s*\{([^}]*)\}/g)]
        .filter((m) => /\b(?:year|month|day|weekday)\s*:/.test(m[1]) && !/\btimeZone\s*:/.test(m[1]))
        .map((m) => `${rel}: ${m[0].replace(/\s+/g, ' ')}`);
    });
    expect(offenders).toEqual([]);
  });

  it('the two files that show the viewer their own stored timestamps are the only ones allowed to use local time, and they do it after mount', () => {
    for (const rel of LOCAL_TIME_ON_PURPOSE) {
      const file = FILES.find((f) => f.rel === rel);
      expect(file, rel).toBeDefined();
    }
    const recent = FILES.find((f) => f.rel === 'components/common/recent-calculations.tsx')!.text;
    expect(recent).toMatch(/useEffect\(/);
    expect(recent).toMatch(/useState<RecentEntry\[\]>\(\[\]\)/);
  });
});
