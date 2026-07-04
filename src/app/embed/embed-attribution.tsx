'use client';

/**
 * EmbedAttribution — the "Powered by FIREPath" backlink shown inside the
 * /embed iframe, plus the embed_loaded mount event (부속I T04 / 부속P CODE-03).
 *
 * Link-policy audit (부속I T04 / anti-pattern #8, reconciled per 부속P §4
 * CODE-03 + §8 anti-pattern #2): the attribution link is rel="nofollow ugc"
 * — Google's explicit guidance is that widget/embed-distributed links MUST
 * be nofollow or they are a link-scheme violation; "ugc" (rather than
 * "sponsored") because no payment/compensation changes hands for an embed
 * install, matching Google's ugc-vs-sponsored distinction. The anchor uses a
 * brand-name ("FIREPath", never a commercial keyword phrase like "fire
 * calculator"), and carries utm_source=embed&utm_medium=widget&
 * utm_campaign={host_domain} so referral traffic from embeds is attributable
 * without relying on a followed link for SEO credit.
 */

import { useEffect } from 'react';
import { trackEvent } from '@/lib/analytics';

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');

function hostDomain(): string {
  if (typeof document === 'undefined' || !document.referrer) return 'unknown';
  try {
    return new URL(document.referrer).hostname;
  } catch {
    return 'unknown';
  }
}

export function EmbedAttribution() {
  useEffect(() => {
    // Fires once per widget mount. The embed route never loads AdSense and
    // never tracks the HOST page's users — this event only records that the
    // widget itself rendered, tagged with the referring host for attribution.
    trackEvent('embed_loaded', { host_domain: hostDomain() });
  }, []);

  const host = typeof document !== 'undefined' && document.referrer ? hostDomain() : 'direct';
  const href = `${SITE_URL}/?utm_source=embed&utm_medium=widget&utm_campaign=${encodeURIComponent(host)}`;

  return (
    <div className="mt-4 text-center text-xs text-muted-foreground">
      <a
        href={href}
        target="_blank"
        rel="nofollow ugc noopener"
        className="underline hover:text-foreground"
      >
        Powered by FIREPath
      </a>
      {' — free FIRE calculator'}
    </div>
  );
}
