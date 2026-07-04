import { ImageResponse } from 'next/og';
import { FIRE_COLORS } from '@/constants/fire-colors';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildOgVisual, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/og-visual';
import { buildFireStatisticsDataset } from '@/lib/seo/statistics';

/**
 * opengraph-image.tsx (`/fire-statistics`) — 부속P CODE-05.
 *
 * Same buildFireStatisticsDataset() the page body renders from — the
 * headline range (Lean-to-Fat spread) baked in as real computed text, plus
 * the "As of {date}" dated freshness marker. No fabricated ratings or
 * superlatives (부속P §4 CODE-05 acceptance).
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';
export const alt = 'FIRE Statistics — FIRE target amounts compared across all 5 FIRE types';

export default async function Image() {
  const dataset = buildFireStatisticsDataset();
  const lean = dataset.rankedFireTypes.find((r) => r.type === 'lean')!;
  const fat = dataset.rankedFireTypes.find((r) => r.type === 'fat')!;
  const regular = dataset.rankedFireTypes.find((r) => r.type === 'regular')!;

  return new ImageResponse(
    buildOgVisual({
      eyebrow: 'FIREPath',
      title: 'FIRE Statistics: Targets Compared Across 5 Types',
      stats: [
        { label: 'Lean FIRE (lowest)', value: formatCurrencyFull(lean.targetAmount), accent: FIRE_COLORS.lean },
        { label: 'Regular FIRE', value: formatCurrencyFull(regular.targetAmount), accent: FIRE_COLORS.regular },
        { label: 'Fat FIRE (highest)', value: formatCurrencyFull(fat.targetAmount), accent: FIRE_COLORS.fat },
      ],
      dataVerifiedDate: dataset.dataVerifiedDate,
    }),
    { ...OG_SIZE }
  );
}
