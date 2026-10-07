'use client';

import type { GatedResult } from '@/lib/engine/example-scenarios';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';

export function ResultSummaryChips({ gated }: { gated: GatedResult }) {
  const { results } = gated.output;
  return (
    <div data-result-chips="true">
      <p className="mb-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{gated.caption}</span> — the age you reach each FIRE type
      </p>
      <ul className="flex flex-wrap gap-2">
        {FIRE_TYPES.map((type) => {
          const age = results[type].reachAge;
          return (
            <li
              key={type}
              aria-label={type === 'coast' ? `${FIRE_LABELS[type]}: coast-ready at age ${age ?? '80+'}` : undefined}
              className="inline-flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm"
            >
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: FIRE_COLORS[type] }}
              />
              <span>
                {FIRE_LABELS[type].replace(' FIRE', '')}{' '}
                <span className="font-semibold tabular-nums">{age ?? '80+'}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
