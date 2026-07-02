'use client';

/**
 * RecentCalculations — homepage "Recent calculations" list (부속I T16).
 *
 * Reads the cc_recent localStorage index written by useCalculatorPersistence()
 * (max 5 entries, calc_type + date + link only — NEVER a result value, on
 * this or any site per spec). Renders nothing when the index is empty or on
 * the server (no hydration mismatch: starts empty, fills in after mount).
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { History } from 'lucide-react';
import { getRecentCalculations, type RecentEntry } from '@/hooks/use-calculator-persistence';

const CALC_TYPE_LABELS: Record<string, string> = {
  fire_timeline: 'FIRE Timeline',
  healthcare_bridge: 'Healthcare Bridge',
};

function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function RecentCalculations({ className }: { className?: string }) {
  const [entries, setEntries] = useState<RecentEntry[]>([]);

  useEffect(() => {
    // Deferred via queueMicrotask — same pattern as TermsGate/AdSlot to avoid
    // the react-hooks/set-state-in-effect cascading-render lint warning.
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setEntries(getRecentCalculations());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (entries.length === 0) return null;

  return (
    <section
      aria-label="Recent calculations"
      className={`rounded-xl border bg-card p-4 md:p-6 ${className ?? ''}`}
    >
      <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
        <History className="h-5 w-5 text-[var(--brand-primary)]" aria-hidden="true" />
        Recent calculations
      </h2>
      <ul className="space-y-2">
        {entries.map((entry) => (
          <li key={`${entry.calcType}-${entry.savedAt}`}>
            <Link
              href={entry.path}
              className="flex items-center justify-between rounded-lg border bg-background px-3 py-2 text-sm hover:shadow-sm transition-shadow duration-200"
            >
              <span className="font-medium">
                {CALC_TYPE_LABELS[entry.calcType] ?? entry.calcType}
              </span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {formatRelativeDate(entry.savedAt)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
