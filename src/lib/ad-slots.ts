/**
 * ad-slots.ts — the single place this repo resolves an AdSense slot id
 * (부속W CODE-01).
 *
 * WHY THIS EXISTS
 * Manual AdSense units are `<ins class="adsbygoogle" data-ad-slot="…">`
 * elements. Without a REAL numeric slot id there is nothing for AdSense to
 * fill, so every ad component in this repo renders nothing when its slot env
 * var is unset — correct behaviour (never ship an empty grey box), but it made
 * the whole portfolio silently unmonetizable: a live audit found ZERO
 * `<ins class="adsbygoogle">` elements across all 10 domains even though the
 * loader script and the publisher meta tag were present (부속W §2.3).
 *
 * The aggravating factor was NAMING. Each repo invented its own env var:
 *   firepath          NEXT_PUBLIC_ADSENSE_SLOT_RESULT / _SLOT_GUIDE
 *   LaunchCostCalc    NEXT_PUBLIC_ADSENSE_RESULT_SLOT / _MID_SLOT   ← words swapped!
 *   SaaSCostX         NEXT_PUBLIC_ADSENSE_SLOT_ID
 *   DentalCostFinder  NEXT_PUBLIC_ADSENSE_SLOT_ID
 * so setting a value in one Vercel project lit up nothing in the others.
 *
 * CONTRACT (identical in every repo of the portfolio)
 * `NEXT_PUBLIC_ADSENSE_SLOT_ID` is the CANONICAL name. Set that one variable
 * and every placement in this repo resolves. Per-placement variables still
 * win when present, so existing deployments keep working unchanged.
 *
 * A slot id is only accepted when it looks like a real AdSense slot id
 * (`/^\d{6,}$/`). Anything else — a placement label like "rectangle", a
 * leftover "TODO", an empty string — resolves to `undefined` so the caller
 * renders no `<ins>` at all. A malformed `data-ad-slot` never fills; emitting
 * one only produces an invalid unit and a misleading empty ad region.
 *
 * NOTE: slot ids are NOT secrets. They ship in the rendered HTML, which is why
 * they are `NEXT_PUBLIC_*`.
 */

/** Logical ad placements in this repo. Each maps to its legacy env var below. */
export type AdPlacement = 'result' | 'guide';

/** A syntactically valid AdSense slot id: digits only, at least 6 of them. */
export const SLOT_ID_PATTERN = /^\d{6,}$/;

/** Canonical, portfolio-wide slot env var — set this one and everything works. */
const CANONICAL_SLOT_ENV = 'NEXT_PUBLIC_ADSENSE_SLOT_ID';

/**
 * Per-placement legacy env vars, checked BEFORE the canonical name so any
 * existing deployment keeps its current behaviour. Read via an explicit
 * process.env.X reference (not a computed lookup) because Next.js inlines
 * NEXT_PUBLIC_* values at build time only for statically analysable access.
 */
function legacyEnvFor(placement: AdPlacement): string | undefined {
  switch (placement) {
    case 'result':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT;
    case 'guide':
      return process.env.NEXT_PUBLIC_ADSENSE_SLOT_GUIDE;
    default:
      return undefined;
  }
}

/** True when `value` is a syntactically valid AdSense slot id. */
export function isValidSlotId(value: string | undefined | null): value is string {
  return typeof value === 'string' && SLOT_ID_PATTERN.test(value.trim());
}

/**
 * Resolves the numeric AdSense slot id for a placement, or `undefined` when
 * none is configured (caller must then render no `<ins>`).
 *
 * Precedence: explicit numeric argument → placement's legacy env var →
 * canonical `NEXT_PUBLIC_ADSENSE_SLOT_ID`.
 *
 * A non-numeric `explicit` value is treated as a placement hint, not an id, so
 * call sites may keep passing labels; it simply falls through to the env vars.
 */
export function resolveAdSlot(placement: AdPlacement, explicit?: string): string | undefined {
  if (isValidSlotId(explicit)) return explicit.trim();

  const candidates = [legacyEnvFor(placement), process.env.NEXT_PUBLIC_ADSENSE_SLOT_ID];
  for (const candidate of candidates) {
    if (isValidSlotId(candidate)) return candidate.trim();
  }
  return undefined;
}

/** The canonical env var name, exported for docs/tests/error messages. */
export const CANONICAL_SLOT_ENV_NAME = CANONICAL_SLOT_ENV;
