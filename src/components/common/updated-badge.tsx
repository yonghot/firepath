import { CalendarCheck } from 'lucide-react';
import { CORE_ASSUMPTIONS_LAST_VERIFIED } from '@/lib/figures';

/**
 * UpdatedBadge — visible "Updated for {year}" freshness signal (부속I T11).
 *
 * Reads the SAME `lastVerified` field the JSON-LD `dateModified` on this page
 * and ResultDisclaimer's "Figures last updated" line already read
 * (src/lib/figures.ts CORE_ASSUMPTIONS_LAST_VERIFIED) — never a hand-typed
 * date, so the badge can never claim freshness the underlying data doesn't
 * have (deceptive-freshness risk, 부속I §6 anti-pattern 10).
 *
 * Placed near the calculator/page title, distinct from ResultDisclaimer
 * (which lives beside the RESULT output further down the page).
 */
export function UpdatedBadge({
  lastVerified = CORE_ASSUMPTIONS_LAST_VERIFIED,
  className,
}: {
  /** ISO date override — defaults to the central figures registry. */
  lastVerified?: string;
  className?: string;
}) {
  const year = new Date(lastVerified).getUTCFullYear();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground ${className ?? ''}`}
    >
      <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Updated for {year}
      <time dateTime={lastVerified} className="sr-only">
        {lastVerified}
      </time>
    </span>
  );
}
