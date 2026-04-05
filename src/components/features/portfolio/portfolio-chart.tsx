'use client';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { PortfolioAllocation } from '@/lib/engine/portfolio-optimizer';
import { ASSET_CLASSES } from '@/lib/engine/portfolio-optimizer';

interface PortfolioChartProps {
  portfolio: PortfolioAllocation;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; payload: { fill: string } }>;
}) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="rounded-md bg-neutral-900 p-2 shadow-lg text-xs">
      <span className="text-white font-medium">{d.name}: </span>
      <span className="font-mono text-white">{(d.value * 100).toFixed(0)}%</span>
    </div>
  );
}

export function PortfolioChart({ portfolio }: PortfolioChartProps) {
  const data = portfolio.allocations
    .filter((a) => a.weight > 0)
    .map((a) => {
      const ac = ASSET_CLASSES.find((c) => c.id === a.assetId)!;
      return { name: ac.label, value: a.weight, fill: ac.color };
    });

  return (
    <div className="w-full h-[200px]">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            animationDuration={300}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function PortfolioLegend({ portfolio }: PortfolioChartProps) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {portfolio.allocations
        .filter((a) => a.weight > 0)
        .map((a) => {
          const ac = ASSET_CLASSES.find((c) => c.id === a.assetId)!;
          return (
            <div key={a.assetId} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-sm shrink-0"
                style={{ backgroundColor: ac.color }}
              />
              <span className="text-xs text-muted-foreground">{ac.label}</span>
              <span className="text-xs font-mono font-medium ml-auto">
                {(a.weight * 100).toFixed(0)}%
              </span>
            </div>
          );
        })}
    </div>
  );
}
