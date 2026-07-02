/**
 * ResultDisclaimer — layered disclaimer placed ADJACENT to calculator results
 * (never footer-only). Investment/tax variant per legal risk mitigation pass:
 *
 *   "This is an estimate for general informational purposes only. It is not
 *   investment, tax, or financial advice. We are not an investment adviser
 *   (Investment Advisers Act) ... projections are hypothetical."
 *
 * Extends (does not duplicate) the existing DisclaimerBanner component —
 * DisclaimerBanner keeps its original short-form copy for lower-stakes
 * surfaces; ResultDisclaimer is the fuller layered version required directly
 * beside RESULT output, and additionally surfaces the figures' last-verified
 * date + a primary-source link pulled from the central figures registry.
 *
 * IMPERSONAL FRAMING: copy intentionally avoids "your retirement plan" /
 * "you will reach" in favor of "this scenario" / "the scenario's" so results
 * read as general/hypothetical output, not individualized advice (Investment
 * Advisers Act / Lowe framing).
 */

import { AlertTriangle } from 'lucide-react';
import { getFiguresLastUpdated, getFiguresPrimarySource } from '@/lib/figures';

interface ResultDisclaimerProps {
  className?: string;
  /** Optional override for the "figures last updated" date (ISO). Defaults to the central figures registry. */
  lastUpdated?: string;
}

export function ResultDisclaimer({ className, lastUpdated }: ResultDisclaimerProps) {
  const figuresDate = lastUpdated ?? getFiguresLastUpdated();
  const primarySource = getFiguresPrimarySource();
  const formatted = new Date(figuresDate).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div
      role="note"
      aria-label="Results disclaimer"
      className={`rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200 ${className ?? ''}`}
    >
      <div className="flex gap-2">
        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
        <div className="space-y-2">
          <p>
            <strong>This is an estimate for general informational purposes only.</strong> It
            is not investment, tax, or financial advice. FIREPath is not a law firm, tax
            advisor, or an investment adviser as defined under the Investment Advisers Act of
            1940 — nothing here is a personalized recommendation to buy, sell, or hold any
            security, or to adopt any particular retirement strategy. These projections are
            hypothetical: they illustrate what the entered assumptions imply mathematically,
            not a prediction or guarantee of actual results.
          </p>
          <p>
            Figures and assumption defaults may be outdated or inaccurate — verify with the
            official source before relying on them. Consult a licensed financial advisor, tax
            professional, or attorney before acting on this scenario.
          </p>
          <p className="text-[10px] uppercase tracking-wide text-amber-800/80 dark:text-amber-300/80">
            Figures last updated: <time dateTime={figuresDate}>{formatted}</time>
            {' · '}
            <a
              href={primarySource.url}
              className="underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-100 focus-visible:outline-none focus-visible:underline"
            >
              {primarySource.label}
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
