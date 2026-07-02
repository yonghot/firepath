import type { Metadata } from 'next';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import { EmbedAttribution } from './embed-attribution';

/**
 * /embed — minimal-chrome calculator for iframe embedding on third-party sites.
 *
 * No site header/footer (this route is OUTSIDE the (main) route group, so it
 * does not inherit that layout) and NO ads. The attribution "Powered by FIREPath"
 * link lives in EmbedAttribution (부속I T04 link-policy audit: nofollow
 * sponsored, brand anchor, UTM-tagged) AND must be reproduced in the PARENT
 * page HTML by the embedder (see the snippet on /embed-this) so the backlink
 * counts for SEO there too.
 */

export const metadata: Metadata = {
  title: 'FIREPath Calculator (Embed)',
  description: 'Embeddable FIRE calculator.',
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <CalculatorClient />
      <EmbedAttribution />
    </div>
  );
}
