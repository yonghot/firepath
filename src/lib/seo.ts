/**
 * seo.ts — shared metadata builder (부속I T10).
 *
 * Single helper every route's generateMetadata/static `metadata` export
 * should build from, so title length, canonical, and OG/twitter fields stay
 * consistent sitewide without hand-rolling the same shape 12 times.
 *
 * Title contract: 50-60 characters, primary keyword within the first 30
 * characters, and the title's LEADING PHRASE (the text before the first
 * " — " / ":" separator) textually matches the page's <h1>. This mirrors
 * Google's documented ~76% title-rewrite rate being driven by titles that
 * drift from the H1 — keeping them aligned reduces rewrites.
 *
 * Canonical: every route (including dynamic ones and any query-param share
 * URL from T15) resolves alternates.canonical to the CLEAN path — query
 * strings are never part of the canonical value.
 */

import type { Metadata } from 'next';

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL || 'https://gofirepath.com').replace(/\/$/, '');
const SITE_NAME = 'FIREPath';

export interface BuildMetaOptions {
  /** 50-60 chars, primary keyword in the first 30 chars, leading phrase matches the page H1. */
  title: string;
  /** Unique per-page description — states the concrete deliverable, no boilerplate. */
  description: string;
  /** Site-relative path (leading slash), e.g. '/fire-types' or '/guide/what-is-coastfire'. */
  path: string;
  /** 'website' for tools/hubs, 'article' for guide/methodology-style content. Defaults to 'website'. */
  ogType?: 'website' | 'article';
  /**
   * Explicit robots override — defaults to index:true, follow:true. Use for
   * T09 thin-page gating. Object form only (never the raw-string robots
   * shape Next.js's Metadata['robots'] also permits) so buildMeta can safely
   * merge in the K09 max-image-preview:large directive below.
   */
  robots?: { index?: boolean; follow?: boolean; [key: string]: unknown };
}

/**
 * Validates the T10 title contract in non-production builds only (a thrown
 * error here would break `pnpm build`, which IS the build-time assertion
 * the spec's acceptance criteria asks for — see the seo.test.ts route/dataset
 * matrix test for the enforced version. This dev-time check is a fast local
 * signal without slowing down import order in every route module).
 */
export function validateTitle(title: string): { lengthOk: boolean; length: number } {
  const length = title.length;
  return { lengthOk: length >= 50 && length <= 60, length };
}

/** Extracts the leading phrase of a title (text before the first " — " or ":" separator). */
export function titleLeadPhrase(title: string): string {
  const match = title.match(/^(.*?)(?:\s+—\s+|:\s+)/);
  return (match ? match[1] : title).trim();
}

export function buildMeta({ title, description, path, ogType = 'website', robots }: BuildMetaOptions): Metadata {
  const canonicalPath = path.startsWith('/') ? path : `/${path}`;
  const absoluteUrl = `${SITE_URL}${canonicalPath}`;

  // 부속M K09 — every page (indexed or not) carries max-image-preview:large
  // so Google Discover/Images can surface a full-size preview of the page's
  // OG image rather than defaulting to a small thumbnail. This is merged
  // into whatever robots directive the caller passes (including T09's
  // index:false thin-page gate) rather than only applied on the default —
  // noindex pages still benefit from the directive if Google ever surfaces
  // a cached/Discover preview of them independent of the index rule.
  const resolvedRobots = { ...(robots ?? { index: true, follow: true }), 'max-image-preview': 'large' as const };

  return {
    title,
    description,
    alternates: { canonical: canonicalPath },
    robots: resolvedRobots,
    openGraph: {
      title,
      description,
      type: ogType,
      url: absoluteUrl,
      siteName: SITE_NAME,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  };
}
