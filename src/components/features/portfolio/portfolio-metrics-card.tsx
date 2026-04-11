'use client';

import type { PortfolioAllocation } from '@/lib/engine/portfolio-optimizer';

interface PortfolioMetricsCardProps {
  portfolio: PortfolioAllocation;
  inflation: number;
}

interface MetricRowProps {
  label: string;
  value: string;
}

function MetricRow({ label, value }: MetricRowProps) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono font-semibold text-sm">{value}</span>
    </div>
  );
}

export function PortfolioMetricsCard({ portfolio, inflation }: PortfolioMetricsCardProps) {
  const realReturn = ((1 + portfolio.expectedReturn) / (1 + inflation) - 1) * 100;

  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-2xl font-semibold mb-1">Portfolio Metrics</h3>
      <div className="space-y-3 mt-3">
        <MetricRow
          label="Expected Annual Return"
          value={`${(portfolio.expectedReturn * 100).toFixed(1)}%`}
        />
        <MetricRow
          label="Annual Volatility (Risk)"
          value={`${(portfolio.volatility * 100).toFixed(1)}%`}
        />
        <MetricRow
          label="Sharpe Ratio"
          value={portfolio.sharpeRatio.toFixed(2)}
        />
        <MetricRow
          label="Real Return (after inflation)"
          value={`${realReturn.toFixed(1)}%`}
        />
      </div>
    </div>
  );
}
