'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';
import type { MonteCarloPercentile } from '@/lib/engine/monte-carlo';
import type { FIREOutput } from '@/types/fire.types';
import { FIRE_COLORS } from '@/constants/fire-colors';

interface MonteCarloChartProps {
  percentiles: MonteCarloPercentile[];
  results: FIREOutput['results'];
}

function MCTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string; payload: MonteCarloPercentile }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  return (
    <div className="rounded-md bg-neutral-900 p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-1">Age {label}</p>
      <div className="space-y-0.5 text-xs">
        <p className="text-neutral-300">
          90th: <span className="font-mono font-medium text-white">{formatCurrency(data.p90)}</span>
        </p>
        <p className="text-neutral-300">
          75th: <span className="font-mono font-medium text-white">{formatCurrency(data.p75)}</span>
        </p>
        <p className="font-medium text-white">
          Median: <span className="font-mono font-bold">{formatCurrency(data.p50)}</span>
        </p>
        <p className="text-neutral-300">
          25th: <span className="font-mono font-medium text-white">{formatCurrency(data.p25)}</span>
        </p>
        <p className="text-neutral-300">
          10th: <span className="font-mono font-medium text-white">{formatCurrency(data.p10)}</span>
        </p>
      </div>
    </div>
  );
}

export function MonteCarloChart({ percentiles, results }: MonteCarloChartProps) {
  const maxVal = Math.max(...percentiles.map((d) => d.p90));
  const yMax = Math.ceil(maxVal / 100000) * 100000;

  return (
    <div className="w-full h-[300px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={percentiles} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="mcGrad90" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.05} />
              <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="mcGrad75" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--brand-primary)" stopOpacity={0.1} />
              <stop offset="95%" stopColor="var(--brand-primary)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="mcGrad50" x1="0" y1="0" x2="0" y2="1">
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
          <Tooltip content={<MCTooltip />} />

          {/* 10-90 percentile band */}
          <Area
            type="monotone"
            dataKey="p90"
            stroke="none"
            fill="url(#mcGrad90)"
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="p10"
            stroke="none"
            fill="var(--background, #ffffff)"
            fillOpacity={0}
            animationDuration={300}
          />

          {/* 25-75 percentile band */}
          <Area
            type="monotone"
            dataKey="p75"
            stroke="none"
            fill="url(#mcGrad75)"
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="p25"
            stroke="none"
            fill="var(--background, #ffffff)"
            fillOpacity={0}
            animationDuration={300}
          />

          {/* Median line */}
          <Area
            type="monotone"
            dataKey="p50"
            stroke="var(--brand-primary)"
            strokeWidth={2}
            fill="url(#mcGrad50)"
            animationDuration={300}
          />

          {/* FIRE target reference lines */}
          {(['lean', 'regular', 'fat', 'barista'] as const).map((type) => (
            <ReferenceLine
              key={type}
              y={results[type].targetAmount}
              stroke={FIRE_COLORS[type]}
              strokeDasharray="5 5"
              strokeWidth={1}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
