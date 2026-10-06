import { ImageResponse } from 'next/og';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { FIRE_COLORS } from '@/constants/fire-colors';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildOgVisual, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/og-visual';
import { getPageLastModified } from '@/lib/content-pages';

/**
 * opengraph-image.tsx (`/fire-types`) — 부속M K09.
 *
 * Same computed-figures source as the page body (calculateFIRE(DEFAULT_INPUT)
 * — the exact function/inputs FireTypeCard renders from), never a second,
 * inconsistent set of "example" numbers.
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';
export const alt = 'FIRE Types Explained — Lean, Fat, Coast, and Barista targets compared';

export default async function Image() {
  const { results } = calculateFIRE(DEFAULT_INPUT);

  return new ImageResponse(
    buildOgVisual({
      eyebrow: 'FIREPath',
      title: 'FIRE Types Explained: Lean, Fat, Coast, Barista',
      stats: [
        { label: 'Lean FIRE', value: formatCurrencyFull(results.lean.targetAmount), accent: FIRE_COLORS.lean },
        { label: 'Fat FIRE', value: formatCurrencyFull(results.fat.targetAmount), accent: FIRE_COLORS.fat },
        { label: 'Coast FIRE', value: formatCurrencyFull(results.coast.targetAmount), accent: FIRE_COLORS.coast },
        {
          label: 'Barista FIRE',
          value: formatCurrencyFull(results.barista.targetAmount),
          accent: FIRE_COLORS.barista,
        },
      ],
      lastUpdated: getPageLastModified('/fire-types'),
    }),
    { ...OG_SIZE }
  );
}
