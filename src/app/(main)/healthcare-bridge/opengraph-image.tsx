import { ImageResponse } from 'next/og';
import { calculateHealthcareBridge, MEDICARE_ELIGIBILITY_AGE } from '@/lib/engine/healthcare-bridge';
import { formatCurrencyFull } from '@/lib/utils/format';
import { buildOgVisual, OG_SIZE, OG_CONTENT_TYPE } from '@/lib/og/og-visual';

/**
 * opengraph-image.tsx (`/healthcare-bridge`) — 부속M K09.
 *
 * Same worked-example input the page body uses (age 35, retire 50,
 * $7,200/yr premium, 5% growth — matching HealthcareBridgeCalculator's own
 * DEFAULT_FORM pre-fill), run through the identical calculateHealthcareBridge()
 * engine. No fabricated ACA subsidy figures, consistent with the page's own
 * "What this tool does NOT do" stance.
 */

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const runtime = 'edge';
export const alt = 'Healthcare Bridge Estimator — private insurance cost before Medicare at 65';

const EXAMPLE_INPUT = {
  currentAge: 35,
  retirementAge: 50,
  annualPremium: 7200,
  annualGrowthRate: 0.05,
};

export default async function Image() {
  const computed = calculateHealthcareBridge(EXAMPLE_INPUT);
  const result = computed.ok ? computed.result : null;

  const stats = result
    ? [
        { label: 'Bridge years (retire at 50)', value: `${result.bridgeYears} yrs` },
        { label: 'Estimated total cost', value: formatCurrencyFull(result.totalEstimatedCost) },
        { label: 'Medicare eligibility age', value: `${MEDICARE_ELIGIBILITY_AGE}` },
      ]
    : [{ label: 'Medicare eligibility age', value: `${MEDICARE_ELIGIBILITY_AGE}` }];

  return new ImageResponse(
    buildOgVisual({
      eyebrow: 'FIREPath',
      title: 'Healthcare Bridge Estimator: Cost Before Medicare',
      stats,
    }),
    { ...OG_SIZE }
  );
}
