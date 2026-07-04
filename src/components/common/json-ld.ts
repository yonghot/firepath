/**
 * Centralized JSON-LD builders for FIREPath structured data.
 *
 * These return plain objects; render them via a <script type="application/ld+json">
 * tag with JSON.stringify(obj) (same pattern already used across the repo).
 *
 * URLs are absolute (built from NEXT_PUBLIC_APP_URL) where a stable identity is
 * required (Organization, SoftwareApplication, breadcrumbs) so search engines /
 * AI parsers can resolve them. No ratings/reviews are fabricated.
 */

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');

const abs = (path: string) =>
  path.startsWith('http') ? path : `${SITE_URL}${path.startsWith('/') ? path : `/${path}`}`;

/**
 * Sitewide editorial Person identity (부속I T11 E-E-A-T linkage).
 *
 * Deliberately generic — "FIREPath Editorial Team" — matching the honest
 * identity already used by AuthorByline (src/components/common/author-byline.tsx).
 * NO invented name, credential, or license is attached; that would be
 * fabrication (부속I §6 anti-pattern) and an E&O exposure. When the owner adds
 * a real named/credentialed reviewer, replace this with their verified identity.
 */
export function personJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: 'FIREPath Editorial Team',
    worksFor: {
      '@type': 'Organization',
      name: 'FIREPath',
      url: SITE_URL,
    },
    description:
      'FIREPath’s editorial team maintains the calculator’s formulas, source citations, and methodology documentation.',
  };
}

/** Sitewide Organization identity (rendered once in the root layout). */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'FIREPath',
    url: SITE_URL,
    logo: abs('/logo.png'),
    description:
      'FIREPath is a free calculator that compares five FIRE (Financial Independence, Retire Early) types on one interactive timeline.',
  };
}

/**
 * SoftwareApplication for the main calculator tool. No aggregateRating.
 *
 * 부속I T11: accepts an optional `dateModified` (ISO date) driven by a REAL
 * lastVerified field (src/lib/figures.ts) — never a hand-stamped "freshness"
 * date — plus Person + Organization linkage via `author`/`publisher` so the
 * calculator page carries the same E-E-A-T identity as the Organization
 * schema in the root layout.
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
    author: {
      '@type': 'Person',
      name: 'FIREPath Editorial Team',
    },
    publisher: {
      '@type': 'Organization',
      name: 'FIREPath',
      url: SITE_URL,
    },
    ...(options?.dateModified && { dateModified: options.dateModified }),
  };
}

/**
 * Dataset JSON-LD for the /fire-statistics linkable-asset page (부속P
 * CODE-04). schema.org/Dataset is still supported (unlike FAQPage/HowTo —
 * see faq-section.tsx history) and is the correct entity for an
 * original-statistics page. `distribution` points at the same real
 * aggregate figures exposed as /data.json and /data.csv, so every surface
 * (page prose, JSON-LD, downloadable feeds) draws from one dataset.
 */
export function fireStatisticsDatasetJsonLd(options: { dateModified: string; description: string }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Dataset',
    name: 'FIREPath FIRE Target Statistics',
    description: options.description,
    url: abs('/fire-statistics'),
    license: 'https://creativecommons.org/licenses/by/4.0/',
    isAccessibleForFree: true,
    creator: {
      '@type': 'Organization',
      name: 'FIREPath',
      url: SITE_URL,
    },
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
