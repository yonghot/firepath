'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { FIREType, FIREResult } from '@/types/fire.types';
import { FIREResultCard } from './fire-result-card';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import { trackEvent } from '@/lib/analytics';
import { embedLinkProps } from '@/lib/embed-links';

interface FIREResultCardsProps {
  results: Record<FIREType, FIREResult>;
  onHighlight?: (type: FIREType | null) => void;
  embedded?: boolean;
}

export function FIREResultCards({ results, onHighlight, embedded }: FIREResultCardsProps) {
  const [highlighted, setHighlighted] = useState<FIREType | null>(null);

  const handleHover = (type: FIREType | null) => {
    setHighlighted(type);
    onHighlight?.(type);
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-5">
      {FIRE_TYPES.map((type) => (
        <div key={type} className="min-w-0">
          <FIREResultCard
            type={type}
            result={results[type]}
            color={FIRE_COLORS[type]}
            isHighlighted={highlighted === type}
            onHover={handleHover}
          />
          <Link
            href={`/fire-types#${type}`}
            {...embedLinkProps(embedded)}
            onClick={() =>
              trackEvent('related_click', { link_module: 'compare_chain', link_context: type, link_url: `/fire-types#${type}` })
            }
            className="mt-1 flex min-h-11 items-center text-sm text-foreground/80 underline underline-offset-4 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {`How ${FIRE_LABELS[type]} is calculated`}
          </Link>
        </div>
      ))}
    </div>
  );
}
