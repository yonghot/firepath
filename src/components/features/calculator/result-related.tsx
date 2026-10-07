'use client';

/**
 * ResultRelated — internal sibling-link module at the result moment (부속I T06).
 *
 * Links INTERNAL FIREPath content pages (FIRE-type deep dives, guides, the
 * healthcare bridge tool) and fires related_click {link_module:'result_related'}.
 *
 * Renders ONLY after a real user-driven result exists — gated on the same
 * hasUserInteracted signal T03 uses (interactionCount > 0 from
 * useCalculatorStore, incremented only by updateInput(), never by the
 * default SSR render or setInput() hash-hydration). Placed directly BELOW
 * the result block, ABOVE any below-result ad slot, with a heading label
 * ("More calculators") and a bordered card treatment visually distinct from
 * AdSlot's dashed "Advertisement" placeholder — never styled like an ad.
 *
 * Links are computed from the FIRE type with the earliest reachAge in this
 * scenario's real output (a genuine per-scenario data point, not a fabricated
 * personalization) plus the shared content-pages registry (부속I T09
 * hasUniqueData gate) — every href resolves to an existing quality-gated
 * page, verified by a build-time test (see content-pages.test.ts).
 */

import Link from 'next/link';
import { Compass } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { getRelatedContentPages } from '@/lib/content-pages';
import { embedLinkProps } from '@/lib/embed-links';
import type { FIREOutput } from '@/types/fire.types';

interface ResultRelatedProps {
  /** Only render once a real result exists (T03's hasUserInteracted signal). */
  hasResult: boolean;
  /** Current scenario output — used to find the earliest-reachable FIRE type for relevance ranking. */
  output: FIREOutput;
  className?: string;
  embedded?: boolean;
}

/** The FIRE type with the earliest reachAge in this scenario (nulls sort last) — a real per-scenario data point. */
function earliestReachableType(output: FIREOutput): FIREOutput['results'][keyof FIREOutput['results']]['type'] | null {
  const entries = Object.values(output.results);
  const reachable = entries.filter((r) => r.reachAge !== null);
  if (reachable.length === 0) return null;
  reachable.sort((a, b) => (a.reachAge as number) - (b.reachAge as number));
  return reachable[0].type;
}

export function ResultRelated({ hasResult, output, className, embedded }: ResultRelatedProps) {
  if (!hasResult) return null;

  const fireType = earliestReachableType(output);
  const links = getRelatedContentPages(fireType, 5);
  if (links.length < 3) return null; // Never render a module below the minimum 3 links.

  return (
    <section
      aria-label="More calculators and guides"
      className={`mt-6 rounded-xl border bg-card p-4 md:p-6 ${className ?? ''}`}
    >
      <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
        <Compass className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
        More calculators
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Go deeper on this scenario with related FIREPath guides and tools.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {links.map((page) => (
          <Link
            key={page.path}
            href={page.path}
            {...embedLinkProps(embedded)}
            onClick={() =>
              trackEvent('related_click', { link_module: 'result_related', link_url: page.path })
            }
            className="block rounded-xl border bg-background p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <p className="text-sm font-medium">{page.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{page.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
