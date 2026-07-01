import type { Metadata } from 'next';
import { CalculatorClient } from '@/components/features/calculator/calculator-client';

/**
 * /embed — minimal-chrome calculator for iframe embedding on third-party sites.
 *
 * No site header/footer (this route is OUTSIDE the (main) route group, so it
 * does not inherit that layout) and NO ads. The attribution "Powered by FIREPath"
 * link lives here AND must be reproduced in the PARENT page HTML by the embedder
 * (see the snippet on /embed-this) so the backlink counts for SEO.
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
      <div className="mt-4 text-center text-xs text-muted-foreground">
        <a
          href="https://gofirepath.com"
          target="_blank"
          rel="noopener"
          className="underline hover:text-foreground"
        >
          Powered by FIREPath — free FIRE calculator
        </a>
      </div>
    </div>
  );
}
