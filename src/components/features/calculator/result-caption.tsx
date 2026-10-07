'use client';

import type { GatedResult } from '@/lib/engine/example-scenarios';
import { focusTermsConsent } from '@/components/compliance/TermsGate';

export function ResultCaption({ gated }: { gated: GatedResult }) {
  return (
    <div data-result-caption="true" role="status" aria-live="polite" className="min-h-6 text-sm">
      {gated.isExample ? (
        <span className="inline-flex rounded-md border border-border bg-muted/40 px-2 py-1 font-medium">
          {gated.caption}
        </span>
      ) : (
        <span className="font-medium">{gated.caption}</span>
      )}
      {gated.withheld && (
        <span className="mt-2 block text-muted-foreground">
          These are not your numbers yet.{' '}
          <button
            type="button"
            onClick={focusTermsConsent}
            className="rounded-sm underline underline-offset-2 hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
          >
            Agree to the terms below
          </button>{' '}
          to see results for your own inputs.
        </span>
      )}
    </div>
  );
}
