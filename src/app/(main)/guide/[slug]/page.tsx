import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createGuideService } from '@/lib/services/guide.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';

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

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const guide = await createGuideService(supabase).getBySlug(slug);

  if (!guide) return { title: 'Guide Not Found' };

  return {
    title: guide.title,
    description: guide.description,
    alternates: { canonical: `/guide/${slug}` },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: 'article',
    },
  };
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
      return `<a href="${url}" class="text-[var(--brand-light)] underline hover:text-[var(--brand-primary)]" rel="noopener noreferrer">${label}</a>`;
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
      result.push(`<h3 class="text-2xl font-semibold mt-6 mb-2">${renderInline(line.slice(4))}</h3>`);
    } else if (line.startsWith('## ')) {
      result.push(`<h2 class="text-3xl font-bold mt-8 mb-3">${renderInline(line.slice(3))}</h2>`);
    } else if (line.startsWith('# ')) {
      result.push(`<h1 class="text-4xl font-bold mt-8 mb-4">${renderInline(line.slice(2))}</h1>`);
    } else if (isList) {
      if (!inList) {
        result.push('<ul class="list-disc pl-6 space-y-1 my-2">');
        inList = true;
      }
      result.push(`<li class="text-muted-foreground">${renderInline(line.slice(2))}</li>`);
    } else if (line.startsWith('| ')) {
      result.push(`<div class="text-sm text-muted-foreground font-mono">${esc(line)}</div>`);
    } else if (line.trim() === '') {
      result.push('<br />');
    } else {
      result.push(`<p class="text-muted-foreground leading-relaxed">${renderInline(line)}</p>`);
    }
  }

  // Close trailing list
  if (inList) result.push('</ul>');

  return result.join('\n');
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const { guide, related } = await createGuideService(supabase).getWithRelated(slug);

  if (!guide) notFound();

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

  const breadcrumbJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: '/' },
      { '@type': 'ListItem', position: 2, name: 'FIRE Guides', item: '/guide' },
      { '@type': 'ListItem', position: 3, name: guide.title, item: `/guide/${slug}` },
    ],
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <div className="flex flex-col lg:flex-row gap-8">
        <article className="flex-1 min-w-0">
          <Badge variant="secondary" className="mb-4 capitalize">
            {guide.fire_type}
          </Badge>

          <div
            className="prose prose-sm max-w-none"
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
        </article>

        {/* Sidebar */}
        {related.length > 0 && (
          <aside className="lg:w-64 shrink-0">
            <h3 className="font-semibold mb-3">Related Guides</h3>
            <nav className="space-y-2">
              {related.map((g) => (
                <Link
                  key={g.slug}
                  href={`/guide/${g.slug}`}
                  className="block p-3 rounded-xl border hover:bg-muted/50 transition-colors duration-200"
                >
                  <p className="text-sm font-medium">{g.title}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{g.description}</p>
                </Link>
              ))}
            </nav>
          </aside>
        )}
      </div>
    </div>
  );
}
