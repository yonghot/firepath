'use client';

import type { FIREType, FIREResult } from '@/types/fire.types';
import { Card, CardContent } from '@/components/ui/card';
import { FIRE_LABELS, FIRE_DESCRIPTIONS } from '@/constants/fire-colors';
import { formatCurrency, formatCurrencyFull } from '@/lib/utils/format';

interface FIREResultCardProps {
  type: FIREType;
  result: FIREResult;
  color: string;
  isHighlighted: boolean;
  onHover: (type: FIREType | null) => void;
}

export function FIREResultCard({
  type,
  result,
  color,
  isHighlighted,
  onHover,
}: FIREResultCardProps) {
  const { reachAge, targetAmount, yearsToReach, monthlyPassiveIncome } = result;

  return (
    <Card
      className={`relative overflow-hidden transition-all duration-200 cursor-pointer min-w-[180px] ${
        isHighlighted ? 'shadow-md scale-[1.02]' : 'hover:shadow-sm'
      }`}
      style={{ borderLeftWidth: '4px', borderLeftColor: color }}
      onMouseEnter={() => onHover(type)}
      onMouseLeave={() => onHover(null)}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color }}>
            {FIRE_LABELS[type]}
          </span>
        </div>

        <div className="text-3xl font-bold tabular-nums">
          {reachAge !== null ? (
            <span>
              {reachAge} <span className="text-sm font-normal text-muted-foreground">yrs</span>
            </span>
          ) : (
            <span className="text-lg text-muted-foreground">80+</span>
          )}
        </div>

        <p className="text-xs text-muted-foreground line-clamp-1">{FIRE_DESCRIPTIONS[type]}</p>

        <div className="space-y-1 pt-1 border-t text-xs">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Target</span>
            <span className="font-medium tabular-nums">{formatCurrency(targetAmount)}</span>
          </div>
          {yearsToReach !== null && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">In</span>
              <span className="font-medium tabular-nums">{yearsToReach} years</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Monthly</span>
            <span className="font-medium tabular-nums">{formatCurrencyFull(monthlyPassiveIncome)}/mo</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
