/**
 * Centralized JSON-LD builders for FIREPath structured data.
 *
 * These return plain objects; render them via a <script type="application/ld+json">
 * tag with JSON.stringify(obj) (same pattern already used across the repo).
 *
 * URLs are absolute (built from SITE_URL) where a stable identity is
 * required (Organization, SoftwareApplication, breadcrumbs) so search engines /
 * AI parsers can resolve them. No ratings/reviews are fabricated.
 */

import { PUBLISHER, SITE_URL } from '@/lib/site';

const abs = (path: string) =>
  path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/** The publisher as an embeddable node: the one value author/publisher/creator properties resolve to. */
export function publisherJsonLd() {
  return {
    '@type': 'Organization',
    name: PUBLISHER.name,
    url: PUBLISHER.url,
  } as const;
}

/** Sitewide publisher identity (rendered once in the root layout). */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    ...publisherJsonLd(),
    email: PUBLISHER.email,
  };
}

/**
 * SoftwareApplication for the main calculator tool. No aggregateRating.
 *
 * 부속I T11: accepts an optional `dateModified` (ISO date) — pass the page
 * registry date (getPageLastModified in src/lib/content-pages.ts), never a
 * hand-stamped "freshness" date — plus `author`/`publisher` resolving to the publisher Organization
 * so the calculator page carries the same identity as the root layout.
 */
export function calculatorAppJsonLd(options?: { dateModified?: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'FIREPath FIRE Calculator',
    url: SITE_URL,
    applicationCategory: 'FinanceApplication',
    operatingSystem: 'Web',
    description:
      'Free FIRE calculator comparing Lean, Regular, Fat, Coast, and Barista FIRE on one interactive timeline with real-time charts.',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    author: publisherJsonLd(),
    publisher: publisherJsonLd(),
    ...(options?.dateModified && { dateModified: options.dateModified }),
  };
}

/**
 * Dataset JSON-LD for the /fire-statistics linkable-asset page (부속P
 * CODE-04). schema.org/Dataset is still supported (unlike FAQPage/HowTo —
 * see faq-section.tsx history) and is the correct entity for a page of
 * calculated scenario figures (not survey data). `distribution` points at the same real
 * aggregate figures exposed as /data.json and /data.csv, so every surface
 * (page prose, JSON-LD, downloadable feeds) draws from one dataset.
 */
export function fireStatisticsDatasetJsonLd(options: { dateModified: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'FIREPath FIRE Target Scenarios',
    description: options.description,
    url: abs('/fire-statistics'),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: publisherJsonLd(),
    dateModified: options.dateModified,
    distribution: [
      {
        '@type': 'DataDownload',
        encodingFormat: 'application/json',
        contentUrl: abs('/data.json'),
      },
      {
        '@type': 'DataDownload',
        encodingFormat: 'text/csv',
        contentUrl: abs('/data.csv'),
      },
    ],
  };
}

/**
 * BreadcrumbList from an ordered list of {name, path} crumbs. Paths are made
 * absolute so the markup is valid regardless of where it renders.
 */
export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: abs(c.path),
    })),
  };
}
