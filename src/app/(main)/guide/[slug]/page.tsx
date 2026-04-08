import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { GuideRepository } from '@/lib/repositories/guide.repository';
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
    const { createClient } = await import('@/lib/supabase/server');
    const { GuideRepository } = await import('@/lib/repositories/guide.repository');
    const supabase = await createClient();
    const repo = new GuideRepository(supabase);
    const guides = await repo.findAll();
    return guides.map((g) => ({ slug: g.slug }));
  } catch {
    // Supabase unavailable at build time — fall back to dynamic rendering
    return [];
  }
}

export async function generateMetadata({ params }: GuidePageProps): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const repo = new GuideRepository(supabase);
  const guide = await repo.findBySlug(slug);

  if (!guide) return { title: 'Guide Not Found' };

  return {
    title: guide.title,
    description: guide.description,
  };
}

export default async function GuidePage({ params }: GuidePageProps) {
  const { slug } = await params;
  const supabase = await createClient();
  const repo = new GuideRepository(supabase);

  const [guide, allGuides] = await Promise.all([
    repo.findBySlug(slug),
    repo.findAll(),
  ]);

  if (!guide) notFound();

  const relatedGuides = allGuides.filter((g) => g.slug !== slug).slice(0, 3);

  // Sanitize text to prevent XSS
  const esc = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  const htmlContent = guide.content
    .split('\n')
    .map((line: string) => {
      if (line.startsWith('### ')) return `<h3 class="text-2xl font-semibold mt-6 mb-2">${esc(line.slice(4))}</h3>`;
      if (line.startsWith('## ')) return `<h2 class="text-3xl font-bold mt-8 mb-3">${esc(line.slice(3))}</h2>`;
      if (line.startsWith('# ')) return `<h1 class="text-4xl font-bold mt-8 mb-4">${esc(line.slice(2))}</h1>`;
      if (line.startsWith('- ')) return `<li class="ml-4 text-muted-foreground">${esc(line.slice(2))}</li>`;
      if (line.startsWith('| ')) return `<div class="text-sm text-muted-foreground font-mono">${esc(line)}</div>`;
      if (line.trim() === '') return '<br />';
      return `<p class="text-muted-foreground leading-relaxed">${esc(line)}</p>`;
    })
    .join('\n');

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
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
        {relatedGuides.length > 0 && (
          <aside className="lg:w-64 shrink-0">
            <h3 className="font-semibold mb-3">Related Guides</h3>
            <nav className="space-y-2">
              {relatedGuides.map((g) => (
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
