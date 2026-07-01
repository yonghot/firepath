import { Users } from 'lucide-react';

/**
 * AuthorByline — E-E-A-T author attribution + "Last updated" date.
 *
 * Uses a generic editorial identity ("FIREPath Editorial Team"). It deliberately
 * does NOT claim a named, licensed financial reviewer — that requires a real
 * person's credentials (see ownerNeeded). A clearly-marked placeholder notes
 * that a licensed reviewer (CFP) should be added.
 */

export function AuthorByline({
  lastUpdated,
  className,
}: {
  /** ISO date string, e.g. "2026-06-28". */
  lastUpdated: string;
  className?: string;
}) {
  const formatted = new Date(lastUpdated).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground ${className ?? ''}`}
    >
      <Users className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        By the <strong className="text-foreground">FIREPath Editorial Team</strong>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        Last updated{' '}
        <time dateTime={lastUpdated}>{formatted}</time>
      </span>
      {/* PLACEHOLDER: replace with a real licensed reviewer (CFP). See ownerNeeded. */}
      <span aria-hidden="true">·</span>
      <span className="italic">Reviewed for accuracy by our editorial team</span>
    </div>
  );
}
