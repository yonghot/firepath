'use client';

import { Calculator } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';

/**
 * RelatedCalculators — cross-link module to the four sibling cost-calculator
 * sites (FIREPath links the OTHER four, never itself). Contextual anchors +
 * short descriptions, rendered tastefully at the end of a page. External links
 * are rel="noopener" and intentionally not the same identical sitewide block on
 * every surface (keep placement selective to avoid link-scheme signals).
 *
 * 부속I T04 — every click fires outbound_click (this is the cross-SITE link
 * module, not an internal related-content module, so it maps to
 * outbound_click / link_type:'crosslink' rather than related_click).
 */

const SIBLING_SITES = [
  {
    href: 'https://launchcostcalc.com',
    title: 'Startup Launch Cost Calculator',
    description: 'Estimate what it really costs to launch your startup or new business.',
  },
  {
    href: 'https://saascostx.com',
    title: 'SaaS Cost Calculator',
    description: 'Add up your team’s SaaS subscriptions and find spend per employee.',
  },
  {
    href: 'https://legalcostcalc.co',
    title: 'Legal Cost Calculator',
    description: 'Ballpark attorney fees and legal costs before you hire.',
  },
  {
    href: 'https://dentalcostfinder.co',
    title: 'Dental Cost Finder',
    description: 'Compare typical prices for common dental procedures by region.',
  },
] as const;

export function RelatedCalculators() {
  return (
    <section
      aria-label="More free cost calculators"
      className="mx-auto max-w-3xl px-4 py-8"
    >
      <h2 className="text-xl font-semibold mb-1 flex items-center gap-2">
        <Calculator className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
        More free cost calculators
      </h2>
      <p className="text-sm text-muted-foreground mb-4">
        Other free, no-signup calculators from our network.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {SIBLING_SITES.map((site) => (
          <a
            key={site.href}
            href={site.href}
            target="_blank"
            rel="noopener"
            onClick={() =>
              trackEvent('outbound_click', {
                link_domain: new URL(site.href).hostname,
                link_type: 'crosslink',
              })
            }
            className="block rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <p className="text-sm font-medium">{site.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{site.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
