'use client';

/**
 * Breadcrumbs — visible trail + BreadcrumbList JSON-LD (부속I T07).
 *
 * Renders "Home > ... > Current page" as a plain server-renderable <nav> of
 * <Link>s (crawlable without JS interaction) plus the matching
 * BreadcrumbList structured-data script via the existing
 * src/components/common/json-ld.ts breadcrumbJsonLd() builder — one call
 * site produces both the visible trail and the schema, so they can never
 * drift out of sync.
 *
 * safeJsonLd() escapes </>/& before this developer-authored (never
 * user-supplied) structured-data object is injected — same pattern already
 * used by /fire-types, /healthcare-bridge, and json-ld.ts across this repo.
 *
 * Every non-home crumb link fires related_click {link_module:'breadcrumb'}
 * before navigation (부속I T04). The final crumb (current page) renders as
 * plain text, not a link — it isn't a "click" and shouldn't be one.
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { breadcrumbJsonLd } from '@/components/common/json-ld';
import { safeJsonLd } from '@/lib/utils/json-ld';

export interface BreadcrumbItem {
  name: string;
  path: string;
}

interface BreadcrumbsProps {
  /** Crumbs AFTER "Home" — e.g. [{ name: 'FIRE Guides', path: '/guide' }, { name: 'What is Coast FIRE?', path: '/guide/what-is-coastfire' }]. */
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const crumbs: BreadcrumbItem[] = [{ name: 'Home', path: '/' }, ...items];
  // Developer-authored structured data only (never raw user input) — same
  // safeJsonLd() escaping pattern as the rest of this repo's JSON-LD blocks.
  const jsonLd = safeJsonLd(breadcrumbJsonLd(crumbs));

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      <nav
        aria-label="Breadcrumb"
        className={`mb-4 flex flex-wrap items-center gap-1 text-xs text-muted-foreground ${className ?? ''}`}
      >
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1;
          return (
            <span key={crumb.path} className="flex items-center gap-1">
              {i > 0 && <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />}
              {isLast ? (
                <span aria-current="page" className="font-medium text-foreground">
                  {crumb.name}
                </span>
              ) : (
                <Link
                  href={crumb.path}
                  onClick={() =>
                    trackEvent('related_click', { link_module: 'breadcrumb', link_url: crumb.path })
                  }
                  className="hover:text-foreground transition-colors duration-150 underline-offset-2 hover:underline"
                >
                  {crumb.name}
                </Link>
              )}
            </span>
          );
        })}
      </nav>
    </>
  );
}
