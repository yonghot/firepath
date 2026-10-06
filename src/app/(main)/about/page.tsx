import type { Metadata } from 'next';
import Link from 'next/link';
import { Flame, BookOpen, Calculator, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { buildMeta } from '@/lib/seo';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { PUBLISHER } from '@/lib/site';

export const metadata: Metadata = buildMeta({
  title: 'About FIREPath: Our Editorial Standards and Sources',
  description:
    'FIREPath is a free FIRE calculator comparing Lean, Regular, Fat, Coast, and Barista FIRE on one timeline. Read our mission, editorial standards, and sourcing.',
  path: '/about',
});

/**
 * /about page — publisher identity and E-E-A-T signals for AdSense approval.
 *
 * Establishes:
 * - What FIREPath is and who runs it
 * - Editorial independence and editorial standards
 * - Transparency about the tool's purpose and limitations
 * - Links to methodology, contact, and legal pages
 */
export default function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <Breadcrumbs items={[{ name: 'About', path: '/about' }]} />
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <Flame className="h-8 w-8 text-[var(--fire-coast)]" aria-hidden="true" />
          <h1 className="text-4xl font-bold">About FIREPath</h1>
        </div>
        <p className="text-lg text-muted-foreground leading-relaxed">
          FIREPath is a free, open-access FIRE (Financial Independence, Retire Early)
          calculator that compares all five FIRE types on one interactive timeline.
          Our goal is to give anyone — whether a seasoned investor or a curious
          newcomer — a precise, transparent tool for exploring their path to financial
          independence.
        </p>
      </div>

      {/* What we do */}
      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">What we do</h2>
        <p>
          Most FIRE calculators handle one retirement scenario at a time. FIREPath
          calculates <strong>Lean, Regular, Fat, Coast, and Barista FIRE</strong>{' '}
          simultaneously, displaying all five on a single interactive timeline so you can
          see, at a glance, how each target compares under the same assumptions.
        </p>
        <p>
          All calculations run entirely in your browser. We do not send your financial
          inputs to a server, store them without your consent, or share them with
          advertisers. The math is{' '}
          <Link href="/methodology" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
            fully documented
          </Link>
          .
        </p>
      </section>

      {/* Publisher */}
      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Who publishes FIREPath</h2>
        <p>
          FIREPath is published by {PUBLISHER.name} (
          <a href={PUBLISHER.url} rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
            {new URL(PUBLISHER.url).hostname}
          </a>
          ). {PUBLISHER.correctionRequest}
        </p>
      </section>

      {/* Editorial standards */}
      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Our editorial standards</h2>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Calculator className="h-4 w-4 text-[var(--fire-lean)]" aria-hidden="true" />
              Transparent math
            </div>
            <p className="text-sm text-muted-foreground">
              Every formula is documented in our{' '}
              <Link href="/methodology" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
                methodology
              </Link>
              . No proprietary black boxes — you can verify every number.
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <BookOpen className="h-4 w-4 text-[var(--fire-regular)]" aria-hidden="true" />
              Cited sources
            </div>
            <p className="text-sm text-muted-foreground">
              Default assumptions (4% SWR, 7% nominal return, 3% inflation) are
              grounded in peer-reviewed research and publicly cited. See our{' '}
              <Link href="/methodology" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
                sources list
              </Link>
              .
            </p>
          </div>

          <div className="rounded-xl border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <ShieldCheck className="h-4 w-4 text-[var(--fire-fat)]" aria-hidden="true" />
              Honest limits
            </div>
            <p className="text-sm text-muted-foreground">
              When a FIRE target cannot be reached by age 80 under your inputs,
              we show &ldquo;80+&rdquo; — not a fabricated date. Projections are
              estimates, not guarantees.
            </p>
          </div>
        </div>
      </section>

      {/* Educational purpose */}
      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Educational purpose</h2>
        <p>
          FIREPath is designed for <strong>educational and informational purposes
          only</strong>. The calculator helps you explore scenarios and understand
          the mechanics of long-term investing and retirement planning. It does not
          constitute financial advice, investment advice, tax advice, or legal advice.
        </p>
        <p>
          Real investment returns vary. Market conditions, taxes, sequence-of-returns
          risk, and personal circumstances all affect outcomes that no calculator can
          fully capture. Always consult a qualified financial advisor, tax professional,
          or attorney before making significant financial decisions.
        </p>
      </section>

      {/* Affiliate disclosure */}
      <section className="mb-10 space-y-4">
        <h2 className="text-2xl font-semibold">Affiliate and advertising disclosure</h2>
        <p>
          FIREPath may display advertising (served by Google AdSense) and may include
          affiliate links to third-party products or services. If you click an affiliate
          link and make a purchase, we may receive a commission at no additional cost
          to you. Affiliate relationships do not influence the objectivity of our
          calculator formulas, methodology, or editorial content. We only link to
          services we believe are relevant to FIRE planning.
        </p>
        <p>
          Premium subscribers never see advertisements. See our{' '}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground transition-colors duration-200">
            Privacy Policy
          </Link>{' '}
          for details on how advertising cookies are handled.
        </p>
      </section>

      {/* CTA row */}
      <div className="flex flex-wrap gap-3 pt-2">
        <Link href="/">
          <Button>
            <Calculator className="h-4 w-4 mr-2" aria-hidden="true" />
            Open the Calculator
          </Button>
        </Link>
        <Link href="/methodology">
          <Button variant="outline">Read Our Methodology</Button>
        </Link>
        <Link href="/contact">
          <Button variant="outline">Contact Us</Button>
        </Link>
      </div>
    </div>
  );
}
