import { resolveAdsenseClientId } from '@/lib/ads-env';

export function AdLoader() {
  const clientId = resolveAdsenseClientId();
  if (!clientId) return null;
  return (
    <>
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
      <script
        id="adsense-loader"
        async
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
      />
    </>
  );
}
