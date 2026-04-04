'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { FIREType, FIRETimeline, FIREResult } from '@/types/fire.types';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import { formatCurrency } from '@/lib/utils/format';

interface FIRETimelineChartProps {
  timeline: FIRETimeline[];
  results: Record<FIREType, FIREResult>;
  highlightedType?: FIREType | null;
}

function ChartTooltipContent({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border bg-background/95 backdrop-blur p-3 shadow-lg">
      <p className="text-sm font-semibold">Age {label}</p>
      <p className="text-sm text-muted-foreground">
        Net Worth: <span className="font-mono font-medium text-foreground">{formatCurrency(payload[0].value)}</span>
      </p>
    </div>
  );
}

export function FIRETimelineChart({
  timeline,
  results,
  highlightedType,
}: FIRETimelineChartProps) {
  const maxNetWorth = Math.max(...timeline.map((t) => t.netWorth));
  const yMax = Math.ceil(maxNetWorth / 100000) * 100000;

  return (
    <div className="w-full h-[300px] md:h-[400px] lg:h-[450px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={timeline} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="netWorthGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.2} />
              <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            label={{ value: 'Age', position: 'insideBottom', offset: -5, fontSize: 12 }}
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            width={65}
          />
          <Tooltip content={<ChartTooltipContent />} />

          <Area
            type="monotone"
            dataKey="netWorth"
            stroke="var(--brand-primary)"
            strokeWidth={2}
            fill="url(#netWorthGradient)"
            animationDuration={300}
          />

          {/* FIRE target reference lines */}
          {FIRE_TYPES.map((type) => {
            const result = results[type];
            if (result.targetAmount > yMax * 1.5) return null;
            const isHighlighted = highlightedType === type;
            return (
              <ReferenceLine
                key={type}
                y={result.targetAmount}
                stroke={FIRE_COLORS[type]}
                strokeDasharray={type === 'coast' ? '8 4' : '5 5'}
                strokeWidth={isHighlighted ? 2.5 : 1.5}
                strokeOpacity={highlightedType && !isHighlighted ? 0.3 : 1}
                label={undefined}
              />
            );
          })}

          {/* Achievement point markers */}
          {FIRE_TYPES.map((type) => {
            const result = results[type];
            if (!result.reachAge) return null;
            const isHighlighted = highlightedType === type;
            return (
              <ReferenceLine
                key={`marker-${type}`}
                x={result.reachAge}
                stroke={FIRE_COLORS[type]}
                strokeDasharray="3 3"
                strokeWidth={isHighlighted ? 2 : 1}
                strokeOpacity={highlightedType && !isHighlighted ? 0.2 : 0.6}
              />
            );
          })}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
