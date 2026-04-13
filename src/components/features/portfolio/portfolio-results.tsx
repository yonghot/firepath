'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatCurrency } from '@/lib/utils/format';
import { RISK_PROFILE_COLORS, RISK_PROFILE_LABELS } from '@/lib/engine/portfolio-optimizer';
import type { PortfolioResult, RiskProfile } from '@/lib/engine/portfolio-optimizer';

interface PortfolioGrowthChartProps {
  projectedGrowth: PortfolioResult['projectedGrowth'];
  recommended: string;
}

function GrowthTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: RiskProfile; color: string }>;
  label?: number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-md bg-neutral-900 p-3 shadow-lg ring-1 ring-neutral-700">
      <p className="text-sm font-semibold text-white mb-1">Age {label}</p>
      <div className="space-y-0.5 text-xs">
        {payload.map((p) => (
          <p key={p.dataKey} style={{ color: p.color }}>
            {RISK_PROFILE_LABELS[p.dataKey]}:{' '}
            <span className="font-mono font-medium text-white">
              {formatCurrency(p.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function PortfolioGrowthChart({
  projectedGrowth,
  recommended,
}: PortfolioGrowthChartProps) {
  const maxVal = Math.max(
    ...projectedGrowth.map((d) => Math.max(d.conservative, d.moderate, d.aggressive))
  );
  const yMax = Math.ceil(maxVal / 100000) * 100000;

  return (
    <div className="w-full h-[300px] md:h-[350px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={projectedGrowth} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            {Object.entries(RISK_PROFILE_COLORS).map(([key, color]) => (
              <linearGradient key={key} id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={key === recommended ? 0.15 : 0.05} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>

          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="age"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[0, yMax]}
            tickFormatter={(v: number) => formatCurrency(v)}
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            width={65}
          />
          <Tooltip content={<GrowthTooltip />} />
          <Legend
            formatter={(value: string) => (
              <span className="text-xs">
                {RISK_PROFILE_LABELS[value as RiskProfile] || value}
                {value === recommended ? ' (rec.)' : ''}
              </span>
            )}
          />

          {(['conservative', 'moderate', 'aggressive'] as const).map((profile) => (
            <Area
              key={profile}
              type="monotone"
              dataKey={profile}
              stroke={RISK_PROFILE_COLORS[profile]}
              strokeWidth={profile === recommended ? 2.5 : 1.5}
              fill={`url(#grad-${profile})`}
              animationDuration={300}
              strokeDasharray={profile === recommended ? undefined : '5 5'}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
