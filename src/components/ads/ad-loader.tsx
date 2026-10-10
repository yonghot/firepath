import { resolveAdsenseClientId } from '@/lib/ads-env';

export function AdLoader() {
  const clientId = resolveAdsenseClientId();
  if (!clientId) return null;
  return (
    <>
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
      {/* Do not add itemProp, onLoad or onError: they stop React 19 hoisting this async script into <head>, and AdSense site review needs the snippet there. */}
      <script
        id="adsense-loader"
        async
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      />
    </>
  );
}
