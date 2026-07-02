'use client';

/**
 * RelatedGuides — sidebar sibling-link module on /guide/[slug] (부속I T07).
 *
 * This is one of the spoke page's 3 automated link types (breadcrumb parent,
 * hub link, sibling cross-links) — extracted to a small client leaf so the
 * parent /guide/[slug]/page.tsx can stay a plain async Server Component.
 * Clicks fire related_click {link_module:'hub'} since these are same-hub
 * (/guide) sibling links, distinct from the breadcrumb trail itself.
 */

import Link from 'next/link';
import { trackEvent } from '@/lib/analytics';

interface RelatedGuideItem {
  slug: string;
  title: string;
  description: string;
}

export function RelatedGuides({ guides }: { guides: RelatedGuideItem[] }) {
  if (guides.length === 0) return null;

  return (
    <aside className="lg:w-64 shrink-0">
      <h3 className="font-semibold mb-3">Related Guides</h3>
      <nav className="space-y-2">
        {guides.map((g) => (
          <Link
            key={g.slug}
            href={`/guide/${g.slug}`}
            onClick={() =>
              trackEvent('related_click', { link_module: 'hub', link_url: `/guide/${g.slug}` })
            }
            className="block p-3 rounded-xl border hover:bg-muted/50 transition-colors duration-200"
          >
            <p className="text-sm font-medium">{g.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{g.description}</p>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
