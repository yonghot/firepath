'use client';

import { Card, CardContent } from '@/components/ui/card';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import type { MonteCarloResult } from '@/lib/engine/monte-carlo';

interface MonteCarloResultsProps {
  result: MonteCarloResult;
}

function SuccessBar({ rate, color }: { rate: number; color: string }) {
  const pct = Math.round(rate * 100);
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2.5 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-200"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-sm font-mono font-bold tabular-nums w-12 text-right">{pct}%</span>
    </div>
  );
}

export function MonteCarloResults({ result }: MonteCarloResultsProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {FIRE_TYPES.map((type) => (
        <Card key={type} className="shadow-sm" style={{ borderLeftWidth: '4px', borderLeftColor: FIRE_COLORS[type] }}>
          <CardContent className="p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: FIRE_COLORS[type] }}>
                {FIRE_LABELS[type]}
              </span>
              {result.medianReachAge[type] !== null && (
                <span className="text-xs text-muted-foreground">
                  Median age: <span className="font-mono font-medium">{result.medianReachAge[type]}</span>
                </span>
              )}
            </div>
            <SuccessBar rate={result.successRates[type]} color={FIRE_COLORS[type]} />
            <p className="text-xs text-muted-foreground">
              {Math.round(result.successRates[type] * 100)}% chance of reaching {FIRE_LABELS[type]} by age 80
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
