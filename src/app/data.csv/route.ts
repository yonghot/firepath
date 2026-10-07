/**
 * /data.csv — 부속P CODE-04 machine-readable statistics feed (CSV form).
 *
 * Same buildFireStatisticsDataset() figures as /data.json and the
 * /fire-statistics page — flattened into a single CSV table (one row per
 * FIRE type x retirement-age scenario) for spreadsheet/journalist use.
 */

import { buildFireStatisticsDataset, targetMeaning } from '@/lib/seo/statistics';
import { FIRE_TYPES } from '@/constants/fire-colors';

export const dynamic = 'force-static';
export const revalidate = 86400;

function csvEscape(value: string | number): string {
  const s = String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function GET(): Response {
  const dataset = buildFireStatisticsDataset();

  const header = ['retirement_age', 'fire_type', 'target_amount_usd', 'amount_meaning', 'last_updated'];
  const rows: string[][] = [];

  for (const scenario of dataset.scenarios) {
    for (const type of FIRE_TYPES) {
      rows.push([
        String(scenario.retirementAge),
        type,
        String(scenario.targets[type]),
        targetMeaning(type),
        dataset.lastUpdated,
      ]);
    }
  }

  const lines = [header, ...rows].map((row) => row.map(csvEscape).join(','));
  const body = `${lines.join('\n')}\n`;

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'cache-control': 'public, max-age=86400',
      'content-disposition': 'inline; filename="firepath-fire-statistics.csv"',
    },
  });
}
