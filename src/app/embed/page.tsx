import type { Metadata } from 'next';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';
import { AnswerBlock } from '@/components/common/answer-block';
import { MAIN_CALCULATOR_ANSWER } from '@/lib/seo/geo-entities';
import { isPremiumPurchasable } from '@/lib/premium-availability';
import { EmbedAttribution } from './embed-attribution';
import { EmbedResizeScript } from './embed-resize-script';

/**
 * /embed — minimal-chrome calculator for iframe embedding on third-party sites.
 *
 * No site header/footer (this route is OUTSIDE the (main) route group, so it
 * does not inherit that layout) and NO ads. The attribution "Powered by FIREPath"
 * link lives in EmbedAttribution (부속I T04 / 부속P CODE-03 link-policy audit:
 * rel="nofollow ugc", brand anchor, UTM-tagged) AND must be reproduced in the
 * PARENT page HTML by the embedder (see the snippet on /embed-this) so the
 * backlink counts for SEO there too.
 *
 * 부속P CODE-01 — the same GeoAnswerEntity rendered on the canonical "/" page
 * is wired in here too, so cited embeds also carry the passage-level GEO
 * structure (query-phrased H2, answer paragraph, data table, factor list,
 * sourced stats). EmbedResizeScript (부속P CODE-03) posts the iframe's content
 * height to the parent window so host pages can auto-resize the frame.
 */

export const metadata: Metadata = {
  title: 'FIREPath Calculator (Embed)',
  description: 'Embeddable FIRE calculator.',
  robots: { index: false, follow: false },
};

export default function EmbedPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-4">
      <EmbedResizeScript />
      <CalculatorClient premiumAvailable={isPremiumPurchasable()} />
      <AnswerBlock entity={MAIN_CALCULATOR_ANSWER} idPrefix="embed-geo" className="mt-6" />
      <EmbedAttribution />
    </div>
  );
}
