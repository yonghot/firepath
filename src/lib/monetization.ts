/**
 * monetization.ts — central env-driven monetization config.
 *
 * All values derive exclusively from environment variables. When an env var is
 * absent the corresponding slot value is null — callers MUST treat null as
 * "render nothing". No fabricated links, IDs, phone numbers, or partner data
 * are ever included here.
 *
 * CWV guidance embedded at each slot:
 *   - Every slot reserves a CSS min-height so layout doesn't shift (CLS < 0.1).
 *   - Below-fold slots lazy-load via IntersectionObserver (see AdProvider /
 *     AdSlot). Above-fold / in-result slots pass eager=true.
 *   - LCP surface (result cards) is NEVER obscured by a monetization element.
 */

// ─── Vertical constant ────────────────────────────────────────────────────────
// Personal-finance / FIRE vertical default: CPL (financial advisor lead form).
// This is the project default; it can be overridden by NEXT_PUBLIC_PRIMARY_CTA_TYPE.
export const VERTICAL_DEFAULT_CTA_TYPE = 'cpl' as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type AdProvider = 'adsense' | 'ezoic' | 'raptive' | 'journey' | 'none';
export type PrimaryCTAType = 'call' | 'cpl' | 'affiliate' | 'none';

export interface FeaturedPartner {
  label: string;
  figure: string;
  href: string;
}

export interface MonetizationConfig {
  // Programmatic ad provider (exactly one or none)
  adProvider: AdProvider;
  adsenseClientId: string | null;
  ezoicEnabled: boolean;
  raptiveSiteId: string | null;
  /** Journey by Mediavine site id (부속M K10 — dormant until the 1,000-session/mo threshold; 부속M §6). */
  journeySiteId: string | null;
  // ads.txt redirect
  adsTxtRedirectUrl: string | null;
  // Primary CTA
  primaryCtaType: PrimaryCTAType;
  ppcNumber: string | null;
  ppcLabel: string | null;
  cplUrl: string | null;
  cplLabel: string | null;
  // Featured partners table
  featuredPartners: FeaturedPartner[];
  // Sponsor slot
  sponsorHtml: string | null;
  sponsorBackfillUrl: string | null;
  // Email capture — CAN-SPAM requires a physical postal address to be
  // displayed alongside any commercial email-collection form. Enabled ONLY
  // when BOTH NEXT_PUBLIC_EMAIL_CAPTURE=on AND NEXT_PUBLIC_POSTAL_ADDRESS are
  // set; postalAddress is null whenever the address env var is absent.
  emailCaptureEnabled: boolean;
  postalAddress: string | null;
}

// ─── Featured-partner JSON parsing ───────────────────────────────────────────

/**
 * Safely parses the MON_FEATURED_PARTNERS JSON env var.
 * Returns [] on any error (missing, blank, invalid JSON, wrong shape).
 * NEVER throws.
 */
export function parseFeaturedPartners(raw: string | undefined): FeaturedPartner[] {
  if (!raw || !raw.trim()) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: FeaturedPartner[] = [];
    for (const item of parsed) {
      if (
        item &&
        typeof item === 'object' &&
        typeof item.label === 'string' &&
        typeof item.figure === 'string' &&
        typeof item.href === 'string' &&
        item.label.trim() &&
        item.figure.trim() &&
        item.href.trim()
      ) {
        result.push({
          label: item.label.trim(),
          figure: item.figure.trim(),
          href: item.href.trim(),
        });
      }
    }
    return result;
  } catch {
    return [];
  }
}

// ─── Ad-provider resolution ───────────────────────────────────────────────────

/**
 * Resolves which single ad provider is active.
 * Returns 'adsense' when NEXT_PUBLIC_AD_PROVIDER is unset (default).
 * Returns 'none' for unknown/explicitly-none values.
 */
export function resolveAdProvider(raw: string | undefined): AdProvider {
  if (!raw || !raw.trim()) return 'adsense';
  const v = raw.trim().toLowerCase();
  if (v === 'adsense' || v === 'ezoic' || v === 'raptive' || v === 'journey' || v === 'none') {
    return v;
  }
  return 'none';
}

// ─── Primary CTA type resolution ─────────────────────────────────────────────

export function resolvePrimaryCtaType(raw: string | undefined): PrimaryCTAType {
  if (!raw || !raw.trim()) return VERTICAL_DEFAULT_CTA_TYPE;
  const v = raw.trim().toLowerCase();
  if (v === 'call' || v === 'cpl' || v === 'affiliate' || v === 'none') {
    return v;
  }
  return VERTICAL_DEFAULT_CTA_TYPE;
}

// ─── Normalise AdSense client id ──────────────────────────────────────────────

function normaliseAdsenseId(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const v = raw.trim();
  return v.startsWith('ca-') ? v : `ca-${v}`;
}

// ─── Main config builder ──────────────────────────────────────────────────────

/**
 * Reads all monetization env vars and returns a typed config object.
 * Every field that requires an env var is null when that var is absent.
 *
 * Call at module scope in server components (no request-time overhead).
 */
export function buildMonetizationConfig(): MonetizationConfig {
  const adProvider = resolveAdProvider(process.env.NEXT_PUBLIC_AD_PROVIDER);
  const adsenseClientId = normaliseAdsenseId(process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID);

  const ezoicEnabled =
    process.env.NEXT_PUBLIC_EZOIC_ENABLED?.trim().toLowerCase() === 'true';

  const raptiveSiteId = process.env.NEXT_PUBLIC_RAPTIVE_SITE_ID?.trim() || null;

  const journeySiteId = process.env.NEXT_PUBLIC_JOURNEY_SITE_ID?.trim() || null;

  const adsTxtRedirectUrl = process.env.NEXT_PUBLIC_ADSTXT_REDIRECT_URL?.trim() || null;

  const primaryCtaType = resolvePrimaryCtaType(process.env.NEXT_PUBLIC_PRIMARY_CTA_TYPE);

  const ppcNumber = process.env.NEXT_PUBLIC_PPC_NUMBER?.trim() || null;
  const ppcLabel = process.env.NEXT_PUBLIC_PPC_LABEL?.trim() || null;
  const cplUrl = process.env.NEXT_PUBLIC_CPL_URL?.trim() || null;
  const cplLabel = process.env.NEXT_PUBLIC_CPL_LABEL?.trim() || null;

  const featuredPartners = parseFeaturedPartners(process.env.MON_FEATURED_PARTNERS);

  const sponsorHtml = process.env.NEXT_PUBLIC_SPONSOR_HTML?.trim() || null;
  const sponsorBackfillUrl = process.env.NEXT_PUBLIC_SPONSOR_BACKFILL_URL?.trim() || null;

  const postalAddress = process.env.NEXT_PUBLIC_POSTAL_ADDRESS?.trim() || null;

  // CAN-SPAM requires a physical postal address on commercial email-capture
  // forms. Gate email capture on BOTH the existing feature flag AND a postal
  // address being configured — never show the form without one.
  const emailCaptureEnabled =
    process.env.NEXT_PUBLIC_EMAIL_CAPTURE?.trim().toLowerCase() === 'on' &&
    postalAddress !== null;

  return {
    adProvider,
    adsenseClientId,
    ezoicEnabled,
    raptiveSiteId,
    journeySiteId,
    adsTxtRedirectUrl,
    primaryCtaType,
    ppcNumber,
    ppcLabel,
    cplUrl,
    cplLabel,
    featuredPartners,
    sponsorHtml,
    sponsorBackfillUrl,
    emailCaptureEnabled,
    postalAddress,
  };
}

// ─── CWV helpers ─────────────────────────────────────────────────────────────

/**
 * Minimum heights reserved per slot to prevent CLS.
 * Values deliberately generous; actual ad content fills or clips to container.
 */
export const SLOT_MIN_HEIGHTS = {
  /** Result-area programmatic unit (below calculator output). */
  'result-1': 'min-h-[100px] md:min-h-[280px]',
  /** Featured partner table header row. */
  'partner-table': 'min-h-[120px]',
  /** Sponsor slot. */
  sponsor: 'min-h-[60px]',
} as const;

export type SlotId = keyof typeof SLOT_MIN_HEIGHTS;
