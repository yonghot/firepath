'use client';

import { usePathname } from 'next/navigation';
import { isAdEligiblePath, type AdEligibilityRules } from '@/lib/ad-eligibility';

// An onLoad handler stops React 19 hoisting this async script above the inline consent default in <head>.
function noop() {}

export function AdLoader({ clientId, rules }: { clientId: string; rules: AdEligibilityRules }) {
  const pathname = usePathname();
  if (!pathname || !isAdEligiblePath(pathname, rules)) return null;
  return (
    <>
      <link rel="preconnect" href="https://pagead2.googlesyndication.com" crossOrigin="anonymous" />
      <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
      <script
        id="adsense-loader"
        async
        crossOrigin="anonymous"
        src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${clientId}`}
        onLoad={noop}
      />
    </>
  );
}
