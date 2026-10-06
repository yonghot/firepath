import { ImageResponse } from 'next/og';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { FIRE_COLORS } from '@/constants/fire-colors';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildOgVisual, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/og-visual';
import { getPageLastModified } from '@/lib/content-pages';

/**
 * opengraph-image.tsx (home, `/`) — 부속M K09.
 *
 * Next.js file-convention OG image, auto-wired into this route's metadata
 * (no manual `images` array needed). 1200x630, data-visual style: site name
 * + the real Lean/Regular/Fat FIRE target amounts computed live via
 * calculateFIRE(DEFAULT_INPUT) — the SAME default-scenario numbers the page
 * itself renders (see HowItWorksFire's worked example) — never fabricated.
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';
export const alt = 'FIREPath — Compare Lean, Regular, and Fat FIRE targets on one timeline';

export default async function Image() {
  const { results } = calculateFIRE(DEFAULT_INPUT);

  return new ImageResponse(
    buildOgVisual({
      eyebrow: 'FIREPath',
      title: 'All 5 FIRE Types on One Live Timeline',
      stats: [
        { label: 'Lean FIRE target', value: formatCurrencyFull(results.lean.targetAmount), accent: FIRE_COLORS.lean },
        {
          label: 'Regular FIRE target',
          value: formatCurrencyFull(results.regular.targetAmount),
          accent: FIRE_COLORS.regular,
        },
        { label: 'Fat FIRE target', value: formatCurrencyFull(results.fat.targetAmount), accent: FIRE_COLORS.fat },
      ],
      lastUpdated: getPageLastModified('/'),
    }),
    { ...OG_SIZE }
  );
}
