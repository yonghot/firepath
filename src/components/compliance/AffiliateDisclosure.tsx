/**
 * AffiliateDisclosure — FTC 16 CFR 255 disclosure for placement IMMEDIATELY
 * ABOVE every affiliate/lead CTA and partner table.
 *
 * Standard copy (kept short/plain per FTC .com Disclosures guidance):
 *   "We may earn a commission if you use links on this page. This does not
 *   affect the figures shown."
 *
 * This is the single standard the monetization stack's inline FTC line
 * (FeaturedPartnerTable in ResultMonetization.tsx) is aligned to, and the
 * component every other live-link affiliate CTA (AdvisorCta, PrimaryIntentCTA
 * cpl/affiliate variants, FinancingCta-style components) should render
 * immediately above itself when it renders an outbound link.
 */

export function AffiliateDisclosure({ className }: { className?: string }) {
  return (
    <p
      className={`text-[10px] text-muted-foreground uppercase tracking-wide ${className ?? ''}`}
      aria-label="Affiliate disclosure"
    >
      We may earn a commission if you use links on this page. This does not affect the
      figures shown.
    </p>
  );
}
