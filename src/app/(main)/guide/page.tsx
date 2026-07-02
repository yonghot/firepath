import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createGuideService, GuideService } from '@/lib/services/guide.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calculator } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AdSlot } from '@/components/common/ad-slot';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { safeJsonLd } from '@/lib/utils/json-ld';
import { buildMeta } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/breadcrumbs';

export const metadata: Metadata = buildMeta({
  title: 'FIRE Guides: Learn Every Financial Independence Type',
  description:
    'Comprehensive guides to Lean, Regular, Fat, Coast, and Barista FIRE — learn the differences and find the path that fits your lifestyle.',
  path: '/guide',
  ogType: 'article',
});

export default async function GuidesIndexPage() {
  // When Supabase is unconfigured, skip the client entirely (don't call cookies())
  // and render the empty state. Only the DB query is wrapped in try/catch — NOT
  // createClient()/cookies(), whose dynamic-bailout must not be swallowed.
  // See docs/PROGRESS.md → "인시던트 로그" [2026-06-27].
  let guides: Awaited<ReturnType<GuideService['listAll']>> = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    try {
      guides = await createGuideService(supabase).listAll();
    } catch {
      // DB unreachable — render empty state instead of 500ing this public page.
    }
  }

  // Free tier sees ads on guide surfaces; premium subscribers see nothing.
  const { isPremium } = await getPremiumStatus();

  const itemListJsonLd = guides.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FIRE Guides',
    itemListElement: guides.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g.title,
      url: `/guide/${g.slug}`,
    })),
  } : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {itemListJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
        />
      )}
      <Breadcrumbs items={[{ name: 'FIRE Guides', path: '/guide' }]} />
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-6 w-6 text-[var(--brand-primary)]" />
          <h1 className="text-4xl font-bold">FIRE Guides</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Everything you need to know about Financial Independence, Retire Early.
          Explore different FIRE strategies and find the path that fits your lifestyle.
        </p>
      </div>

      {guides.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {guides.map((guide) => (
            <Link
              key={guide.slug}
              href={`/guide/${guide.slug}`}
              className="group block rounded-xl border bg-card p-6 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <Badge variant="secondary" className="mb-3 capitalize">
                {guide.fire_type}
              </Badge>
              <h2 className="text-xl font-semibold group-hover:text-[var(--brand-primary)] transition-colors duration-200">
                {guide.title}
              </h2>
              <p className="text-sm text-muted-foreground mt-2 line-clamp-3">
                {guide.description}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 rounded-xl border bg-card">
          <BookOpen className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <p className="text-muted-foreground mb-4">
            Guides are coming soon. In the meantime, try the calculator!
          </p>
          <Link href="/">
            <Button>
              <Calculator className="h-4 w-4 mr-2" />
              Open Calculator
            </Button>
          </Link>
        </div>
      )}

      {/* Ad (free tier only) */}
      {!isPremium && <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE} />}

      {/* CTA */}
      <div className="mt-10 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
        <h2 className="text-3xl font-bold mb-2">Ready to Plan Your FIRE Path?</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Use our interactive calculator to compare all 5 FIRE types instantly.
        </p>
        <Link href="/">
          <Button>
            <Calculator className="h-4 w-4 mr-2" />
            Try the Calculator
          </Button>
        </Link>
      </div>
    </div>
  );
}
