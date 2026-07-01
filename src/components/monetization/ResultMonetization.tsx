'use client';

/**
 * ResultMonetization — unified monetization stack for the result area.
 *
 * Inserted BELOW the FIRE result output — never above it (protects LCP).
 *
 * Fixed top-to-bottom order:
 *   (a) PrimaryIntentCTA  — call / cpl / affiliate / none
 *   (b) DisplaySlot       — single programmatic unit via AdProvider
 *   (c) AdvertiserDisclosure + FeaturedPartnerTable (inline FTC disclosure)
 *   (d) SponsorSlot       — 'Sponsored'-labeled slot or CPA backfill
 *   (e) EmailCapture      — reuses existing EmailResultCapture component
 *
 * ENV-GATE LAW: every block renders null when its required env is absent.
 * No empty boxes, no "coming soon" text, no broken links ever appear.
 *
 * Design constraints (design/forbidden.md + design/required.md):
 *   - No purple/blue gradients, no hover:scale-105, no #000000, no emoji icons
 *   - 4px spacing scale, brand tokens only, rounded-xl on cards
 *   - Content area >= ad+affiliate area; each block visually distinct from ads
 *   - Blocks must NOT imitate ads, menus, forms, or download prompts
 */

import { ExternalLink, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AdProvider } from '@/components/monetization/AdProvider';
import { EmailResultCapture } from '@/components/common/email-result-capture';
import {
  buildMonetizationConfig,
  parseFeaturedPartners,
  type FeaturedPartner,
} from '@/lib/monetization';

// ─── Config (resolved at module scope, never per-render) ──────────────────────
// In a 'use client' component process.env.NEXT_PUBLIC_* vars are inlined by
// Next.js at build time, so we call buildMonetizationConfig here safely.
const cfg = buildMonetizationConfig();

// ─── (a) PrimaryIntentCTA ─────────────────────────────────────────────────────

function PrimaryIntentCTA() {
  const type = cfg.primaryCtaType;

  if (type === 'none') return null;

  // call — tel: button
  if (type === 'call') {
    if (!cfg.ppcNumber) return null;
    const label = cfg.ppcLabel ?? 'Speak with a financial advisor';
    return (
      <aside
        aria-label="Financial advisor phone contact"
        className="rounded-xl border border-border bg-card p-6"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Ready to take the next step?
        </p>
        <p className="text-sm text-muted-foreground mb-4 max-w-prose">
          These projections are estimates. A qualified financial advisor can
          review your full picture — taxes, asset allocation, and
          sequence-of-returns risk.
        </p>
        <a
          href={`tel:${cfg.ppcNumber}`}
          aria-label={`${label} — ${cfg.ppcNumber}`}
        >
          <Button className="gap-2">
            <Phone className="h-4 w-4" aria-hidden="true" />
            {label}
          </Button>
        </a>
        <p className="mt-3 text-[10px] text-muted-foreground uppercase tracking-wide">
          Not financial advice — for informational purposes only
        </p>
      </aside>
    );
  }

  // cpl — outbound link to advertiser-hosted form (TCPA liability = 0)
  if (type === 'cpl') {
    if (!cfg.cplUrl) return null;
    const label = cfg.cplLabel ?? 'Find a fee-only financial advisor';
    return (
      <aside
        aria-label="Financial advisor referral"
        className="rounded-xl border border-border bg-card p-6"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Ready to take the next step?
        </p>
        <p className="text-sm text-muted-foreground mb-4 max-w-prose">
          These projections are estimates. A fee-only financial advisor can
          review your full picture — taxes, asset allocation, healthcare costs,
          and sequence-of-returns risk.
        </p>
        <a
          href={cfg.cplUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`${label} (opens in new tab)`}
        >
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {label}
          </Button>
        </a>
        <p className="mt-3 text-[10px] text-muted-foreground uppercase tracking-wide">
          Sponsored link — not financial advice
        </p>
      </aside>
    );
  }

  // affiliate — featured affiliate button (uses first featured partner if present)
  if (type === 'affiliate') {
    const partners = cfg.featuredPartners;
    if (!partners.length) return null;
    const first = partners[0];
    return (
      <aside
        aria-label="Featured robo-advisor"
        className="rounded-xl border border-border bg-card p-6"
      >
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-2">
          Featured option
        </p>
        <p className="text-sm text-muted-foreground mb-4 max-w-prose">
          Consider a low-cost robo-advisor to automate your investment strategy
          toward your FIRE target.
        </p>
        <a
          href={first.href}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label={`${first.label} — ${first.figure} (opens in new tab)`}
        >
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" aria-hidden="true" />
            {first.label}
          </Button>
        </a>
        <p className="mt-3 text-[10px] text-muted-foreground uppercase tracking-wide">
          Affiliate link — we may earn a commission
        </p>
      </aside>
    );
  }

  return null;
}

// ─── (b) DisplaySlot ─────────────────────────────────────────────────────────

function DisplaySlot() {
  const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT;
  // AdProvider handles the null-when-unset case for each provider internally.
  return (
    <div className="min-h-[100px] md:min-h-[280px]">
      <AdProvider slot={slot} />
    </div>
  );
}

// ─── (c) AdvertiserDisclosure + FeaturedPartnerTable ─────────────────────────

function FeaturedPartnerTable({ partners }: { partners: FeaturedPartner[] }) {
  if (!partners.length) return null;

  return (
    <>
      {/* FTC plain-text disclosure inline ABOVE the table — not in footer */}
      <p
        className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2"
        aria-label="Advertiser disclosure"
      >
        Advertiser disclosure: the options below may include affiliate links.
        We may earn a commission if you sign up through these links, at no extra
        cost to you. This does not influence our editorial content.
      </p>

      <div
        className="rounded-xl border border-border bg-card overflow-hidden"
        role="region"
        aria-label="Featured financial services"
      >
        <table className="w-full text-sm" aria-label="Featured partners">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Service
              </th>
              <th
                scope="col"
                className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
              >
                Key figure
              </th>
              <th scope="col" className="px-4 py-3 text-right">
                <span className="sr-only">Link</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {partners.map((p, i) => (
              <tr key={i} className="hover:bg-muted/20 transition-colors duration-150">
                <td className="px-4 py-3 font-medium text-foreground">{p.label}</td>
                <td className="px-4 py-3 text-muted-foreground tabular-nums">
                  {p.figure}
                </td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={p.href}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    aria-label={`Visit ${p.label} (opens in new tab)`}
                    className="inline-flex items-center gap-1 text-xs text-[var(--brand-primary)] hover:underline focus-visible:underline focus-visible:outline-none"
                  >
                    View
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── (d) SponsorSlot ─────────────────────────────────────────────────────────

function SponsorSlot() {
  // Prefer rich HTML sponsor content; fall back to CPA backfill link.
  // SECURITY: NEXT_PUBLIC_SPONSOR_HTML is owner-supplied at build time via env.
  // It is NOT user-generated and NOT runtime request data. The owner is
  // responsible for the content they place in their own deployment env var.
  // We treat it identically to how Next.js itself handles script injection from
  // env (e.g. the AdSense loader in layout.tsx). A comment-only eslint-disable
  // on this single line is the correct approach per project conventions.
  if (cfg.sponsorHtml) {
    return (
      <aside
        aria-label="Sponsored content"
        className="rounded-xl border border-border bg-card p-4 min-h-[60px]"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide mb-2">
          Sponsored
        </p>
        {/* Owner-controlled build-time env var — identical trust level to the
            AdSense script in layout.tsx head. Not user-generated content. */}
        <div dangerouslySetInnerHTML={{ __html: cfg.sponsorHtml }} />
      </aside>
    );
  }

  if (cfg.sponsorBackfillUrl) {
    return (
      <aside
        aria-label="Sponsored link"
        className="rounded-xl border border-border bg-card p-4 min-h-[60px] flex items-center gap-4"
      >
        <p className="text-[10px] text-muted-foreground uppercase tracking-wide shrink-0">
          Sponsored
        </p>
        <a
          href={cfg.sponsorBackfillUrl}
          target="_blank"
          rel="noopener noreferrer sponsored"
          aria-label="Sponsored link (opens in new tab)"
          className="text-sm text-[var(--brand-primary)] hover:underline focus-visible:underline focus-visible:outline-none"
        >
          Learn more
          <ExternalLink className="inline h-3 w-3 ml-1" aria-hidden="true" />
        </a>
      </aside>
    );
  }

  return null;
}

// ─── (e) EmailCapture ────────────────────────────────────────────────────────

function EmailCapture() {
  if (!cfg.emailCaptureEnabled) return null;
  return <EmailResultCapture />;
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * ResultMonetization — drop this directly below the result output.
 *
 * The component is 'use client' because several sub-components (AdSlot,
 * EmailResultCapture) require client-side state/effects.
 *
 * @param isPremium - when true, suppresses the programmatic ad slot (free only).
 */
export function ResultMonetization({ isPremium = false }: { isPremium?: boolean }) {
  const partners = parseFeaturedPartners(process.env.MON_FEATURED_PARTNERS);

  return (
    <section
      aria-label="Related offers and resources"
      className="mt-8 space-y-6"
    >
      {/* (a) Primary intent CTA */}
      <PrimaryIntentCTA />

      {/* (b) Display slot — free tier only, ≥150px below result output */}
      {!isPremium && (
        <DisplaySlot />
      )}

      {/* (c) FTC disclosure + featured partner table */}
      <FeaturedPartnerTable partners={partners} />

      {/* (d) Sponsor slot */}
      <SponsorSlot />

      {/* (e) Email capture */}
      <EmailCapture />
    </section>
  );
}
