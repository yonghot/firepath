import { notFound } from 'next/navigation';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createGuideService, GuideService } from '@/lib/services/guide.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { AdSlot } from '@/components/common/ad-slot';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { safeJsonLd } from '@/lib/utils/json-ld';
import { buildMeta } from '@/lib/seo';
import { GUIDE_PAGES } from '@/lib/content-pages';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { RelatedGuides } from './related-guides';

interface GuidePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const supabase = await createClient();
    const guides = await createGuideService(supabase).listAll();
    return guides.map((g) => ({ slug: g.slug }));
  } catch {
    // Supabase unavailable at build time — fall back to dynamic rendering
    return [];
  }
}

/**
 * 부속I T09 — hasUniqueData gate. Guide content is DB-authored (title/
 * description come from Supabase, not this codebase), so buildMeta() cannot
 * enforce the 50-60 char title-length contract on it the way it does for
 * hardcoded static routes — that enforcement lives in seo.test.ts for the
 * routes this repo controls directly. What this DOES enforce: any slug not
 * present in the static GUIDE_PAGES registry (src/lib/content-pages.ts) is
 * robots-noindexed, so a DB-added guide can never silently bypass the
 * quality gate that T06/T07 link modules already respect.
 */
function isQualityGatedSlug(slug: string): boolean {
  return GUIDE_PAGES.some((p) => p.canonicalPath === `/guide/${slug}`);
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  if (!isSupabaseConfigured()) return { title: 'Guide Not Found' };

  const supabase = await createClient();
  let guide: Awaited<ReturnType<GuideService['getBySlug']>> = null;
  try {
    guide = await createGuideService(supabase).getBySlug(slug);
  } catch {
    // DB unreachable — fall through to the not-found metadata.
  }

  if (!guide) return { title: 'Guide Not Found' };

  const gated = isQualityGatedSlug(slug);

  return buildMeta({
    title: guide.title,
    description: guide.description,
    path: `/guide/${slug}`,
    ogType: 'article',
    robots: gated ? { index: true, follow: true } : { index: false, follow: true },
  });
}

// Sanitize text to prevent XSS
const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Only allow safe URL protocols for rendered links
const isSafeUrl = (url: string) =>
  /^https?:\/\//.test(url) || url.startsWith('/') || url.startsWith('#');

// Render inline markdown: **bold**, *italic*, [text](url)
function renderInline(text: string): string {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
  s = s.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_, label: string, url: string) => {
      const decoded = url.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      if (!isSafeUrl(decoded)) return label;
      return `<a href="${url}" rel="noopener noreferrer">${label}</a>`;
    },
  );
  return s;
}

function renderGuideContent(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let inList = false;

  for (const line of lines) {
    const isList = line.startsWith('- ');

    // Close list if previous was list and current is not
    if (inList && !isList) {
      result.push('</ul>');
      inList = false;
    }

    if (line.startsWith('### ')) {
      result.push(`<h3>${renderInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      result.push(`<h2>${renderInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      result.push(`<h1>${renderInline(line.slice(2))}</h1>`);
    } else if (isList) {
      if (!inList) {
        result.push('<ul>');
        inList = true;
      }
      result.push(`<li>${renderInline(line.slice(2))}</li>`);
    } else if (line.startsWith('| ')) {
      result.push(`<div class="font-mono text-sm">${esc(line)}</div>`);
    } else if (line.trim() === '') {
      // Empty line — prose handles spacing via margins
    } else {
      result.push(`<p>${renderInline(line)}</p>`);
    }
  }

  // Close trailing list
  if (inList) result.push('</ul>');

  return result.join('\n');
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  // Guard env BEFORE createClient() (which calls cookies()): when Supabase is
  // unconfigured, 404 instead of 500. Do NOT wrap createClient()/cookies() in
  // try/catch — that swallows Next's dynamic-rendering bailout. Only the DB query
  // is guarded. See docs/PROGRESS.md → "인시던트 로그" [2026-06-27].
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createClient();
  let result: Awaited<ReturnType<GuideService['getWithRelated']>>;
  try {
    result = await createGuideService(supabase).getWithRelated(slug);
  } catch {
    notFound();
  }
  const { guide, related } = result;

  if (!guide) notFound();

  // Free tier sees ads on guide pages; premium subscribers see nothing.
  const { isPremium } = await getPremiumStatus();

  const htmlContent = renderGuideContent(guide.content);

  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: guide.title,
    description: guide.description,
    author: { '@type': 'Organization', name: 'FIREPath' },
    publisher: { '@type': 'Organization', name: 'FIREPath' },
    ...(guide.created_at && { datePublished: guide.created_at }),
    ...(guide.updated_at && { dateModified: guide.updated_at }),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(articleJsonLd) }}
      />
      <Breadcrumbs
        items={[
          { name: 'FIRE Guides', path: '/guide' },
          { name: guide.title, path: `/guide/${slug}` },
        ]}
      />
      <div className="flex flex-col lg:flex-row gap-8">
        <article className="flex-1 min-w-0">
          <Badge variant="secondary" className="mb-4 capitalize">
            {guide.fire_type}
          </Badge>

          <div
            className="prose prose-neutral dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlContent }}
          />

          {/* CTA */}
          <div className="mt-8 p-6 rounded-xl bg-primary/5 border border-primary/20 text-center">
            <h3 className="text-2xl font-semibold mb-2">Try the FIRE Calculator</h3>
            <p className="text-sm text-muted-foreground mb-4">
              See your personalized {guide.fire_type} FIRE number instantly.
            </p>
            <Link href="/">
              <Button>
                <Calculator className="h-4 w-4 mr-2" />
                Open Calculator
              </Button>
            </Link>
          </div>

          {/* Ad (free tier only) — below the article content, never inline. */}
          {!isPremium && <AdSlot slot={process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE} />}
        </article>

        {/* Sidebar — sibling cross-links (3rd of the 3 automated link types: breadcrumb parent, hub link, siblings). */}
        <RelatedGuides guides={related} />
      </div>
    </div>
  );
}
