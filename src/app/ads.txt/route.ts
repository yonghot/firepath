/**
 * Dynamic ads.txt — Authorized Digital Sellers (IAB).
 *
 * Emits the AdSense authorization line for the id resolved by
 * resolveAdsenseClientId() (the same id the loader and meta tag use);
 * otherwise returns an empty body (no ads → nothing to declare).
 *
 * The client id is the full "ca-pub-XXXXXXXXXXXXXXXX" publisher id; Google's
 * ads.txt line uses the bare publisher number, so we strip the "ca-" prefix.
 * f08c47fec0942fa0 is Google's canonical AdSense certification authority id.
 *
 * Redirect support (Ezoic / Raptive ads.txt managers):
 *   When NEXT_PUBLIC_ADSTXT_REDIRECT_URL is set, this route issues a 301 to
 *   that URL so the provider's ads.txt manager serves the combined file. The
 *   AdSense line is NOT removed from the default path — it keeps working when
 *   the redirect env var is absent. The redirect is used INSTEAD of the
 *   AdSense line only when the env var is explicitly set.
 */

import { resolveAdsenseClientId } from '@/lib/ads-env';

export const dynamic = 'force-dynamic'; // redirect URL may change between deploys
export const revalidate = 86400; // re-evaluate at most once a day

export function GET(): Response {
  // Provider-managed ads.txt redirect (Ezoic / Raptive ads.txt managers).
  const redirectUrl = process.env.NEXT_PUBLIC_ADSTXT_REDIRECT_URL?.trim();
  if (redirectUrl) {
    return new Response(null, {
      status: 301,
      headers: {
        Location: redirectUrl,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  }

  const clientId = resolveAdsenseClientId();

  if (!clientId) {
    return new Response('', {
      status: 200,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
  }

  // ads.txt expects the publisher id WITHOUT the "ca-" prefix.
  const publisherId = clientId.replace(/^ca-/, '');
  const body = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0\n`;

  return new Response(body, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
