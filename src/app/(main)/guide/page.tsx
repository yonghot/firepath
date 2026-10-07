import { createClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createGuideService, GuideService } from '@/lib/services/guide.service';
import { Badge } from '@/components/ui/badge';
import { GuideCardLink } from './guide-card-link';
import { BookOpen } from 'lucide-react';
import type { Metadata } from 'next';
import { resolveAdSlot } from '@/lib/ad-slots';
import { AdSlot } from '@/components/common/ad-slot';
import { getPremiumStatus } from '@/lib/subscription/premium';
import { safeJsonLd } from '@/lib/utils/json-ld';
import { buildMeta } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { NextStep } from '@/components/common/next-step';
import { guideHubNextSteps } from '@/lib/next-steps';
import { AnswerBlock } from '@/components/common/answer-block';
import { buildAnswerBlock, type GeoAnswerEntity } from '@/lib/seo/geo';
import { calculateFIRE } from '@/lib/engine/fire-calculator';
import { DEFAULT_INPUT } from '@/constants/fire-defaults';
import { formatPercent } from '@/lib/utils/format';
import { EXPECTED_RETURN_STAT } from '@/lib/figures';
import { getPageLastModified } from '@/lib/content-pages';
import { SITE_URL } from '@/lib/site';

export const metadata: Metadata = buildMeta({
  title: 'FIRE Guides: Learn Every Financial Independence Type',
  description:
    'The FIREPath guides in one place: Lean, Regular, Fat, Coast and Barista FIRE compared, plus withdrawal research, healthcare before Medicare, methodology and data.',
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
    `At the common defaults (age ${currentAge}, $${annualExpenses.toLocaleString('en-US')}/yr expenses, ` +
    `${formatPercent(safeWithdrawalRate)} SWR), Lean FIRE needs ${fmtShortGuide(guideDefaultResults.lean.targetAmount)}, ` +
    `Regular FIRE needs ${fmtShortGuide(guideDefaultResults.regular.targetAmount)}, and Fat FIRE needs ` +
    `${fmtShortGuide(guideDefaultResults.fat.targetAmount)}. The published guides below explain these illustrative targets, withdrawal assumptions, and healthcare bridge scenarios. As of ${getPageLastModified('/guide')}, these are illustrative defaults, not guaranteed outcomes.`,
  lastUpdated: getPageLastModified('/guide'),
  tableHeaders: [],
  tableRows: [],
  factors: [],
  stats: [
    {
      text: `${formatPercent(safeWithdrawalRate)} default Safe Withdrawal Rate`,
      sourceLabel: 'Trinity Study (1998)',
      sourceUrl: 'https://en.wikipedia.org/wiki/Trinity_study',
    },
    EXPECTED_RETURN_STAT,
  ],
});

const PUBLISHED_GUIDES = [
  { href: '/fire-guide', title: 'The Complete FIRE Guide', description: 'Withdrawal research, savings-rate examples, retirement accounts, and the trade-offs between FIRE approaches.', fire_type: 'Guide' },
  { href: '/fire-types', title: 'Compare the Five FIRE Types', description: 'Formulas, worked examples, and default assumptions for the five FIRE types.', fire_type: 'Comparison' },
  { href: '/healthcare-bridge', title: 'Healthcare Before Medicare', description: 'Estimate the years and premium costs between early retirement and age 65 using an illustrative scenario.', fire_type: 'Healthcare' },
  { href: '/methodology', title: 'How We Calculate', description: 'The formulas, inflation adjustment, simulation horizon, and assumptions behind the FIRE calculator.', fire_type: 'Methodology' },
  { href: '/fire-statistics', title: 'FIRE Target Scenarios', description: 'Compare default scenario targets and retirement-age sensitivities, with downloadable calculation data.', fire_type: 'Data' },
];

export default async function GuidesIndexPage() {
  // createClient() calls cookies(); wrapping it in try/catch swallows Next's dynamic bailout and 500s the static page.
  let guides: Awaited<ReturnType<GuideService['listAll']>> = [];
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    try {
      guides = await createGuideService(supabase).listAll();
    } catch {
      guides = [];
    }
  }

  const { isPremium } = await getPremiumStatus();

  const publishedGuides = [
    ...PUBLISHED_GUIDES,
    ...guides.map((guide) => ({ ...guide, href: `/guide/${guide.slug}` })),
  ];
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'FIRE Guides',
    itemListElement: publishedGuides.map((g, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: g.title,
      url: `${SITE_URL}${g.href}`,
    })),
  };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: safeJsonLd(itemListJsonLd) }}
      />
      <Breadcrumbs items={[{ name: 'FIRE Guides', path: '/guide' }]} />
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <BookOpen className="h-6 w-6 text-[var(--brand-primary)]" />
          <h1 className="text-4xl font-bold">FIRE Guides</h1>
        </div>
        <p className="text-muted-foreground max-w-2xl">
          Every FIREPath guide and reference on one page: the five FIRE types compared at default
          inputs, withdrawal and savings-rate research, healthcare before Medicare, how each number is
          calculated, and downloadable scenario data.
        </p>
      </div>

      <AnswerBlock entity={GUIDE_HUB_ANSWER} idPrefix="guide-hub-geo" className="mb-8" summaryOnly />

      <div className="grid gap-4 md:grid-cols-2">
        {publishedGuides.map((guide) => (
          <GuideCardLink
            key={guide.href}
            href={guide.href}
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
          </GuideCardLink>
        ))}
      </div>

      {/* Ad (free tier only) */}
      {!isPremium && <AdSlot slot={resolveAdSlot('guide')} />}

      <NextStep items={guideHubNextSteps()} className="mt-24" />
    </div>
  );
}
