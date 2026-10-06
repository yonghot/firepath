import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { organizationJsonLd, publisherJsonLd } from '@/components/common/json-ld';
import { resolveAdsenseClientId } from '@/lib/ads-env';
import { ConsentDefault } from '@/components/ads/consent-default';
import { SITE_URL } from '@/lib/site';

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
  metadataBase: new URL(SITE_URL),
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

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ConsentDefault />
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
      </body>
    </html>
  );
}
