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

/** SoftwareApplication for the main calculator tool. No aggregateRating. */
export function calculatorAppJsonLd() {
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
    publisher: {
      '@type': 'Organization',
      name: 'FIREPath',
      url: SITE_URL,
    },
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
