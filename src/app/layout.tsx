import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { organizationJsonLd, publisherJsonLd } from '@/components/common/json-ld';
import { FeedbackWidget } from '@/components/common/feedback-widget';
import { resolveAdsenseClientId } from '@/lib/ads-env';

const inter = Inter({
  variable: '--font-sans',
  subsets: ['latin'],
});

export const viewport: Viewport = {
  themeColor: '#065F53',
};

const _adsenseId = resolveAdsenseClientId();

export const metadata: Metadata = {
  title: {
    default: 'FIREPath — All FIRE Types in One Beautiful Calculator',
    template: '%s | FIREPath',
  },
  description:
    'Compare 5 FIRE types (Lean, Regular, Fat, Coast, Barista) on one interactive timeline. Free FIRE calculator with real-time charts.',
  keywords: ['FIRE calculator', 'financial independence', 'early retirement', 'LeanFIRE', 'FatFIRE', 'CoastFIRE', 'BaristaFIRE'],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com'),
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'FIREPath',
  },
  openGraph: {
    title: 'FIREPath — All FIRE Types in One Beautiful Calculator',
    description: 'Compare 5 FIRE types on one interactive timeline.',
    type: 'website',
    siteName: 'FIREPath',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'FIREPath — All FIRE Types in One Beautiful Calculator',
    description: 'Compare 5 FIRE types on one interactive timeline.',
  },
  robots: {
    index: true,
    follow: true,
    // 부속M K09 — Discover/Images full-size image preview eligibility.
    'max-image-preview': 'large',
  },
  ..._adsenseId && { other: { 'google-adsense-account': _adsenseId } },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'FIREPath',
    description:
      'Compare 5 FIRE types (Lean, Regular, Fat, Coast, Barista) on one interactive timeline. Free FIRE calculator with real-time charts.',
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'FIREPath',
    url: SITE_URL,
    publisher: publisherJsonLd(),
  };

  // Consent Mode v2 defaults. MUST run before any Google script (gtag.js /
  // adsbygoogle.js) so the very first ad/analytics request carries a consent
  // signal. Defaults to DENIED for all storage; the client (cookie banner /
  // region logic) flips to 'granted' via gtag('consent','update', …) per region.
  // wait_for_update gives the region logic a 500ms window to update before the
  // first beacon fires. Static literal (no user input). Harmless when no Google
  // scripts load (no env).
  const consentDefault = `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('consent','default',{ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied',analytics_storage:'denied',wait_for_update:500});`;

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Consent Mode v2 defaults — must precede every Google script. */}
        <script dangerouslySetInnerHTML={{ __html: consentDefault }} />
        {_adsenseId && (
          <>
            {/* Speed up the first AdSense connection. Harmless when unused. */}
            <link
              rel="preconnect"
              href="https://pagead2.googlesyndication.com"
              crossOrigin="anonymous"
            />
            <link rel="dns-prefetch" href="https://googleads.g.doubleclick.net" />
            {/* AdSense loader — loaded UNCONDITIONALLY (not gated by the cookie
                banner). Ad personalization is governed by Consent Mode above,
                not by whether this script loads. Absent when env is unset. */}
            <script
              id="adsense-loader"
              async
              crossOrigin="anonymous"
              src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${_adsenseId}`}
            />
          </>
        )}
      </head>
      <body className="min-h-full flex flex-col font-sans">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Sitewide publisher identity. */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <Providers>{children}</Providers>
        {/* Site-wide floating feedback widget — reports bugs / feature requests */}
        <FeedbackWidget />
      </body>
    </html>
  );
}
