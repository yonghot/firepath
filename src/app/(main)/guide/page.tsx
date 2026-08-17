import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createGuideService, GuideService } from '@/lib/services/guide.service';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BookOpen, Calculator } from 'lucide-react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { resolveAdSlot } from '@/lib/ad-slots';
import { AdSlot } from '@/components/common/ad-slot';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { safeJsonLd } from '@/lib/utils/json-ld';
import { buildMeta } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { AnswerBlock } from '@/components/common/answer-block';
import { buildAnswerBlock, type GeoAnswerEntity } from '@/lib/seo/geo';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT, FIRE_MULTIPLIERS } from '@/constants/fire-defaults';
import { FIRE_LABELS } from '@/constants/fire-colors';
import { formatCurrencyFull, formatPercent } from '@/lib/utils/format';
import { CORE_ASSUMPTIONS_LAST_VERIFIED } from '@/lib/figures';

export const metadata: Metadata = buildMeta({
  title: 'FIRE Guides: Learn Every Financial Independence Type',
  description:
    'Comprehensive guides to Lean, Regular, Fat, Coast, and Barista FIRE — learn the differences and find the path that fits your lifestyle.',
  path: '/guide',
  ogType: 'article',
});

/**
 * 부속P CODE-01 — GEO answer block for the guide hub. Same defaultResults
 * engine output as /fire-types (calculateFIRE(DEFAULT_INPUT)), reframed for
 * the "which FIRE guide should I read" query this hub answers.
 */
const { annualExpenses, safeWithdrawalRate, currentAge } = DEFAULT_INPUT;
const { results: guideDefaultResults } = calculateFIRE(DEFAULT_INPUT);

function fmtShortGuide(n: number): string {
  return n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(2)}M` : `$${Math.round(n / 1000)}K`;
}

const GUIDE_HUB_ANSWER: GeoAnswerEntity = buildAnswerBlock({
  query: 'Which FIRE strategy should you learn first?',
  answer:
    `At the common defaults (age ${currentAge}, $${annualExpenses.toLocaleString()}/yr expenses, ` +
    `${formatPercent(safeWithdrawalRate)} SWR), Lean FIRE needs ${fmtShortGuide(guideDefaultResults.lean.targetAmount)}, ` +
    `Regular FIRE needs ${fmtShortGuide(guideDefaultResults.regular.targetAmount)}, and Fat FIRE needs ` +
    `${fmtShortGuide(guideDefaultResults.fat.targetAmount)}. As of ${CORE_ASSUMPTIONS_LAST_VERIFIED}, each guide below walks through one FIRE type's formula, assumptions, and a fully worked numeric example.`,
  dataVerifiedDate: CORE_ASSUMPTIONS_LAST_VERIFIED,
  tableHeaders: ['FIRE Type', 'Multiplier', 'Target Amount', 'Best Guide'],
  tableRows: (['lean', 'regular', 'fat', 'barista'] as const).map((type) => ({
    label: FIRE_LABELS[type],
    values: [
      `${(FIRE_MULTIPLIERS[type] * 100).toFixed(0)}%`,
      formatCurrencyFull(guideDefaultResults[type].targetAmount),
      `/guide/what-is-${type === 'regular' ? 'regular-fire' : `${type}fire`}`,
    ],
  })),
  factors: [
    'Annual living expenses — the base every FIRE multiplier applies to',
    'Safe withdrawal rate (SWR), typically 3.7%-4%',
    'Expected annual investment return and inflation, which set the real return',
    'Current age and target retirement age',
    'Whether you plan to keep any part-time income (Barista FIRE) or stop contributing early (Coast FIRE)',
    'Current net worth and savings rate, which determine how fast you reach any target',
  ],
  stats: [
    {
      text: `${formatPercent(safeWithdrawalRate)} default Safe Withdrawal Rate`,
      sourceLabel: 'Trinity Study (1998)',
      sourceUrl: 'https://en.wikipedia.org/wiki/Trinity_study',
    },
    {
      text: '7% default nominal expected return',
      sourceLabel: 'NYU Stern historical U.S. equity return data',
      sourceUrl: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/datafile/histretSP.html',
    },
  ],
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

      {/* 부속P CODE-01 — GEO answer block, FIRST content block after the
          header/breadcrumb chrome: query-phrased H2, 40-60 word answer,
          data table, factor list, and >=2 sourced stats — server-rendered.
          DB-authored guide bodies (guide/[slug]) are out of code scope; this
          hub page itself is fully static/hardcoded, so it is in scope. */}
      <AnswerBlock entity={GUIDE_HUB_ANSWER} idPrefix="guide-hub-geo" className="mb-8" />

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
      {!isPremium && <AdSlot slot={resolveAdSlot('guide')} />}

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
