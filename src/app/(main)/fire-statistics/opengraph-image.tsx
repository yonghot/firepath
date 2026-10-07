import { ImageResponse } from 'next/og';
import { FIRE_COLORS } from '@/constants/fire-colors';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildOgVisual, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/og-visual';
import { buildFireStatisticsDataset, expenseMultipleExtremes } from '@/lib/seo/statistics';
import { getPageLastModified } from '@/lib/content-pages';

/**
 * opengraph-image.tsx (`/fire-statistics`) — 부속P CODE-05.
 *
 * Same buildFireStatisticsDataset() the page body renders from — the
 * lowest-to-highest expense-multiple range baked in as real computed text, plus
 * the "As of {date}" dated freshness marker. No fabricated ratings or
 * superlatives (부속P §4 CODE-05 acceptance).
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';
export const alt = 'FIRE Target Scenarios — calculated FIRE target amounts compared across all 5 FIRE types';

export default async function Image() {
  const dataset = buildFireStatisticsDataset();
  const { lowest, highest } = expenseMultipleExtremes(dataset.rankedFireTypes);
  const regular = dataset.rankedFireTypes.find((r) => r.type === 'regular')!;
  const stat = (row: typeof regular) => ({
    label: row.label,
    value: formatCurrencyFull(row.targetAmount),
    accent: FIRE_COLORS[row.type],
  });

  return new ImageResponse(
    buildOgVisual({
      eyebrow: 'FIREPath',
      title: `FIRE Target Scenarios: Compared Across ${dataset.rankedFireTypes.length} Types`,
      stats: [stat(lowest), stat(regular), stat(highest)],
      lastUpdated: getPageLastModified('/fire-statistics'),
    }),
    { ...OG_SIZE }
  );
}
