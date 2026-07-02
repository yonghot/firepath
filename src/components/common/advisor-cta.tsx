'use client';

/**
 * AdvisorCta — env-gated affiliate / advisor-matching call-to-action.
 *
 * INFRASTRUCTURE ONLY. Renders a real outbound link ONLY when the owner has
 * set NEXT_PUBLIC_ADVISOR_CTA_URL in their environment. When the variable is
 * unset (local dev, CI, or any deployment without the env), this component
 * renders nothing at all — never a fake URL, never a broken link.
 *
 * Usage:
 *   Place on result pages, guide pages, or any surface where an advisor CTA
 *   is contextually appropriate. The component is fully self-contained:
 *   no props required (all config via env vars).
 *
 * Environment variables (all optional):
 *   NEXT_PUBLIC_ADVISOR_CTA_URL     — Destination URL for the CTA button.
 *                                     Set by owner; not shipped in source.
 *   NEXT_PUBLIC_ADVISOR_CTA_LABEL   — Override the button label.
 *                                     Default: "Find a fee-only financial advisor"
 *   NEXT_PUBLIC_ADVISOR_CTA_CONTEXT — Override the supporting text.
 *                                     Default: standard informational copy.
 *
 * Design: matches the existing "ready to plan" CTA blocks on guide/result pages.
 * No affiliate URL is hardcoded; no payout or fee is mentioned or fabricated.
 *
 * 부속I T04 — click fires outbound_click {link_domain, link_type:'affiliate'}.
 */

import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AffiliateDisclosure } from '@/components/compliance/AffiliateDisclosure';
import { trackEvent } from '@/lib/analytics';

const CTA_URL = process.env.NEXT_PUBLIC_ADVISOR_CTA_URL;
const CTA_LABEL =
  process.env.NEXT_PUBLIC_ADVISOR_CTA_LABEL ?? 'Find a fee-only financial advisor';
const CTA_CONTEXT =
  process.env.NEXT_PUBLIC_ADVISOR_CTA_CONTEXT ??
  'These projections are estimates. A fee-only financial advisor can review your full picture — taxes, asset allocation, healthcare costs, and sequence-of-returns risk.';

/** Returns null when the env var is not configured — renders nothing. */
export function AdvisorCta({ className }: { className?: string }) {
  if (!CTA_URL) return null;

  return (
    <aside
      aria-label="Financial advisor referral"
      className={`rounded-xl border border-border bg-card p-6 text-center ${className ?? ''}`}
    >
      <p className="text-sm text-muted-foreground mb-4 max-w-prose mx-auto">{CTA_CONTEXT}</p>
      <AffiliateDisclosure className="mb-2" />
      <a
        href={CTA_URL}
        target="_blank"
        rel="noopener noreferrer sponsored"
        aria-label={`${CTA_LABEL} (opens in new tab)`}
        onClick={() => {
          let link_domain = 'unknown';
          try {
            link_domain = new URL(CTA_URL as string).hostname;
          } catch {
            // Malformed/relative URL — keep 'unknown' rather than throw.
          }
          trackEvent('outbound_click', { link_domain, link_type: 'affiliate' });
        }}
      >
        <Button variant="outline" className="gap-2">
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          {CTA_LABEL}
        </Button>
      </a>
      <p className="mt-3 text-[10px] text-muted-foreground uppercase tracking-wide">
        Advertisement — not financial advice
      </p>
    </aside>
  );
}
