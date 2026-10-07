'use client';

import { useState } from 'react';
import type { FIREType, FIREResult } from '@/types/fire.types';
import { FIREResultCard } from './fire-result-card';
import { FIRE_COLORS, FIRE_TYPES } from '@/constants/fire-colors';

interface FIREResultCardsProps {
  results: Record<FIREType, FIREResult>;
  onHighlight?: (type: FIREType | null) => void;
}

export function FIREResultCards({ results, onHighlight }: FIREResultCardsProps) {
  const [highlighted, setHighlighted] = useState<FIREType | null>(null);

  const handleHover = (type: FIREType | null) => {
    setHighlighted(type);
    onHighlight?.(type);
  };

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      {FIRE_TYPES.map((type) => (
        <div key={type}>
          <FIREResultCard
            type={type}
            result={results[type]}
            color={FIRE_COLORS[type]}
            isHighlighted={highlighted === type}
            onHover={handleHover}
          />
        </div>
      ))}
    </div>
  );
}
