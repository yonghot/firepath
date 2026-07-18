import { BellRing } from 'lucide-react';

/**
 * SeasonBadge — subtle re-visit hook tied to a real IRS regulatory date
 * (부속U U-04).
 *
 * WHY November: the IRS announces the FOLLOWING year's retirement-plan
 * contribution limits (401(k)/IRA/catch-up COLAs) every November, based on
 * that autumn's Social Security COLA data. Verified pattern (WebSearch,
 * 2026-07-18 — no fabrication per 부속U §7):
 *   - 2026 limits: announced 2025-11-13 (IR-2025-111 / Notice 2025-67).
 *     https://www.irs.gov/newsroom/401k-limit-increases-to-24500-for-2026-ira-limit-increases-to-7500
 *   - 2025 limits: announced 2024-11-01 — same annual November cadence.
 *   - General COLA page (confirms the recurring pattern):
 *     https://www.irs.gov/retirement-plans/cola-increases-for-dollar-limitations-on-benefits-and-contributions
 *
 * `nextAnnouncement()` below computes, from TODAY'S real date, which
 * November announcement is next and which plan-year it covers — e.g. on
 * 2026-07-18 that's "November 2026" for "2027" limits, matching 부속U §5's
 * literal example ("IRS announces 2027 retirement limits in Nov 2026").
 * This is framed as an EXPECTATION grounded in the cited historical
 * pattern, not a confirmed IRS date (the IRS has not announced 2027 figures
 * as of this writing) — never a fabricated "announced" claim. The badge
 * text stays accurate on its own after each November passes (no manual
 * yearly edit needed), mirroring the `new Date().getFullYear()` pattern
 * already used in footer.tsx.
 *
 * Styled as a token-based pill (border-border / bg-muted/40 / text-xs),
 * matching UpdatedBadge exactly — NOT AdSlot's dashed-placeholder treatment
 * (see ad-slot.tsx `border-dashed`) — so it reads as product chrome, never
 * as an ad unit.
 */

const IRS_COLA_ANNOUNCEMENT_MONTH = 10; // November, 0-indexed (verified: always November)

/** Exported for unit testing (season-badge.test.ts) — pure function, no `window`/`Date.now()` side effects beyond the injected `now`. */
export function nextAnnouncement(now: Date): { announceYear: number; limitsYear: number } {
  const currentYear = now.getFullYear();
  // If this year's November announcement window has already passed, the
  // next one is next November (covering the year after that).
  const announceYear = now.getMonth() > IRS_COLA_ANNOUNCEMENT_MONTH ? currentYear + 1 : currentYear;
  return { announceYear, limitsYear: announceYear + 1 };
}

export function SeasonBadge({ className, now = new Date() }: { className?: string; now?: Date }) {
  const { announceYear, limitsYear } = nextAnnouncement(now);

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground ${className ?? ''}`}
    >
      <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      IRS typically announces {limitsYear} retirement limits in Nov {announceYear} — bookmark your plan
    </span>
  );
}
