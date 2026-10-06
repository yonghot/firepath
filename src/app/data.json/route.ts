/**
 * /data.json — 부속P CODE-04 machine-readable statistics feed.
 *
 * Static export of the exact same dataset the /fire-statistics page renders
 * (src/lib/seo/statistics.ts buildFireStatisticsDataset()) — same real
 * computed figures, no separate/inconsistent copy of the numbers. This is
 * the digital-PR/data-storytelling artifact the owner can pitch (직접 URL
 * or attached to outreach), and a machine-readable target for AI crawlers.
 */

import { buildFireStatisticsDataset } from '@/lib/seo/statistics';

export const dynamic = 'force-static';
export const revalidate = 86400;

export function GET(): Response {
  const dataset = buildFireStatisticsDataset();

  const body = JSON.stringify(
    {
      source: 'https://gofirepath.com/fire-statistics',
      lastUpdated: dataset.lastUpdated,
      headline: dataset.headline,
      rankedFireTypes: dataset.rankedFireTypes,
      scenarios: dataset.scenarios,
      findings: dataset.findings,
      sources: dataset.sources,
      license: 'CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/',
    },
    null,
    2
  );

  return new Response(body, {
    status: 200,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=86400',
    },
  });
}
