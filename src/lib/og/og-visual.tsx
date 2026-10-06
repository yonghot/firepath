/**
 * og-visual.tsx — shared data-visual OG image builder (부속M K09).
 *
 * Renders a 1200x630 (16:9-ish) JSX tree for next/og's ImageResponse: site
 * name + a short list of REAL computed stats, brand tokens only
 * (`--brand-primary` #065F53 solid — no purple/blue gradient per
 * design/forbidden.md), Lucide-free (no emoji/icon glyphs — text and
 * numbers only, matching the "text-first data visual" brief). Every stat
 * passed in must already be a real, engine-computed or sourced figure —
 * this module does no computation and never invents a number itself.
 *
 * Used by each hub/insight page's opengraph-image.tsx route-segment file
 * (Next.js file convention: co-located `opengraph-image.tsx` auto-wires
 * `<meta property="og:image">`/Twitter card — no manual `images` array
 * needed in buildMeta()/generateMetadata()).
 */

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = 'image/png';

// Brand tokens (mirrors globals.css / fire-colors.ts — never a literal
// outside this locked set, never purple/blue gradient combinations).
const BRAND_PRIMARY = '#065F53';
const BRAND_LIGHT = '#0D9488';

export interface OgStat {
  /** Short label, e.g. "Lean FIRE" or "IRS 2026 limit". */
  label: string;
  /** The pre-formatted value string, e.g. "$625,000" or "Age 47". Real data only. */
  value: string;
  /** Optional accent color for this stat's value (defaults to white). Pull from FIRE_COLORS/brand tokens only. */
  accent?: string;
}

export function buildOgVisual({
  eyebrow,
  title,
  stats,
  lastUpdated,
}: {
  /** Small top label, e.g. "FIREPath". */
  eyebrow: string;
  /** Main headline, e.g. "FIRE Types Explained". */
  title: string;
  /** 3-5 real computed/sourced stats rendered as data cards. */
  stats: OgStat[];
  /**
   * ISO date (YYYY-MM-DD) of the page's last real content change (부속P
   * CODE-05). Rendered as "As of {date}" in the footer instead of the
   * generic tagline when provided, so shared images carry a real freshness
   * marker rather than an undated claim. Pass getPageLastModified(path) from
   * src/lib/content-pages.ts, never a hand-typed date.
   */
  lastUpdated?: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        background: BRAND_PRIMARY,
        color: 'white',
        padding: '64px',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          display: 'flex',
          fontSize: '22px',
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          opacity: 0.75,
          color: BRAND_LIGHT,
        }}
      >
        {eyebrow}
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '52px',
          fontWeight: 700,
          marginTop: '16px',
          marginBottom: '48px',
          lineHeight: 1.15,
          maxWidth: '980px',
        }}
      >
        {title}
      </div>

      <div style={{ display: 'flex', gap: '20px', flex: 1, alignItems: 'flex-start' }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              flex: 1,
              background: 'rgba(255,255,255,0.08)',
              borderRadius: '16px',
              padding: '24px',
              borderTop: `4px solid ${s.accent ?? 'rgba(255,255,255,0.4)'}`,
            }}
          >
            <span style={{ fontSize: '16px', opacity: 0.75, marginBottom: '10px' }}>{s.label}</span>
            <span style={{ fontSize: '38px', fontWeight: 700 }}>{s.value}</span>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'flex',
          fontSize: '16px',
          opacity: 0.6,
          marginTop: '32px',
        }}
      >
        {lastUpdated
          ? `gofirepath.com — As of ${lastUpdated}, real computed figures`
          : 'gofirepath.com — Free FIRE calculator, real computed figures'}
      </div>
    </div>
  );
}
