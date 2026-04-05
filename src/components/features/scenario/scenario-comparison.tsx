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
  Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { Scenario, FIREType } from '@/types/fire.types';
import { FIRE_COLORS, FIRE_LABELS, FIRE_TYPES } from '@/constants/fire-colors';
import { formatCurrency } from '@/lib/utils/format';

const SCENARIO_COLORS = ['var(--brand-primary)', '#8B5CF6'] as const;

interface ScenarioComparisonProps {
  scenarios: [Scenario, Scenario];
  onBack: () => void;
}

interface MergedDataPoint {
  age: number;
  netWorth_a: number;
  netWorth_b: number;
}

function mergeTimelines(a: Scenario, b: Scenario): MergedDataPoint[] {
  const map = new Map<number, MergedDataPoint>();

  for (const entry of a.output.timeline) {
    map.set(entry.age, { age: entry.age, netWorth_a: entry.netWorth, netWorth_b: 0 });
  }
  for (const entry of b.output.timeline) {
    const existing = map.get(entry.age);
    if (existing) {
      existing.netWorth_b = entry.netWorth;
    } else {
      map.set(entry.age, { age: entry.age, netWorth_a: 0, netWorth_b: entry.netWorth });
    }
  }

  return Array.from(map.values()).sort((x, y) => x.age - y.age);
}

function ComparisonTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: number }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-neutral-900 p-3 shadow-lg">
      <p className="text-sm font-semibold text-white mb-1">Age {label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: <span className="font-mono font-medium">{formatCurrency(entry.value)}</span>
        </p>
      ))}
      {payload.length === 2 && (
        <p className="text-xs text-neutral-400 mt-1 pt-1 border-t border-neutral-700">
          Diff: <span className="font-mono text-white">{formatCurrency(Math.abs(payload[0].value - payload[1].value))}</span>
        </p>
      )}
    </div>
  );
}

function ComparisonChart({ scenarios }: { scenarios: [Scenario, Scenario] }) {
  const merged = mergeTimelines(scenarios[0], scenarios[1]);
  const maxVal = Math.max(
    ...merged.map((d) => Math.max(d.netWorth_a, d.netWorth_b))
  );
  const yMax = Math.ceil(maxVal / 100000) * 100000;

  return (
    <div className="w-full h-[300px] md:h-[400px]">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={merged} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="gradA" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SCENARIO_COLORS[0]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={SCENARIO_COLORS[0]} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gradB" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={SCENARIO_COLORS[1]} stopOpacity={0.15} />
              <stop offset="95%" stopColor={SCENARIO_COLORS[1]} stopOpacity={0} />
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
          <Tooltip content={<ComparisonTooltip />} />
          <Legend />

          <Area
            type="monotone"
            dataKey="netWorth_a"
            name={scenarios[0].name}
            stroke={SCENARIO_COLORS[0]}
            strokeWidth={2}
            fill="url(#gradA)"
            animationDuration={300}
          />
          <Area
            type="monotone"
            dataKey="netWorth_b"
            name={scenarios[1].name}
            stroke={SCENARIO_COLORS[1]}
            strokeWidth={2}
            fill="url(#gradB)"
            animationDuration={300}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function ResultDiffRow({
  label,
  valueA,
  valueB,
  format,
}: {
  label: string;
  valueA: number | null;
  valueB: number | null;
  format: 'currency' | 'age';
}) {
  const fmt = (v: number | null) => {
    if (v === null) return '—';
    return format === 'currency' ? formatCurrency(v) : `${v} yrs`;
  };

  const diff = valueA !== null && valueB !== null ? valueA - valueB : null;
  const diffColor =
    diff === null ? '' : diff < 0 ? 'text-emerald-600' : diff > 0 ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="grid grid-cols-4 gap-2 text-sm py-1.5 border-b last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono tabular-nums text-right">{fmt(valueA)}</span>
      <span className="font-mono tabular-nums text-right">{fmt(valueB)}</span>
      <span className={`font-mono tabular-nums text-right ${diffColor}`}>
        {diff !== null ? (format === 'age' ? `${diff > 0 ? '+' : ''}${diff}` : formatCurrency(Math.abs(diff))) : '—'}
      </span>
    </div>
  );
}

function ComparisonTable({ scenarios }: { scenarios: [Scenario, Scenario] }) {
  const [a, b] = scenarios;

  return (
    <div className="space-y-4">
      {FIRE_TYPES.map((type) => {
        const rA = a.output.results[type];
        const rB = b.output.results[type];
        return (
          <Card key={type} className="shadow-sm" style={{ borderLeftWidth: '4px', borderLeftColor: FIRE_COLORS[type] }}>
            <CardContent className="p-4">
              <h4 className="text-sm font-bold mb-2" style={{ color: FIRE_COLORS[type] }}>
                {FIRE_LABELS[type]}
              </h4>
              <div className="grid grid-cols-4 gap-2 text-xs font-medium text-muted-foreground pb-1 border-b mb-1">
                <span></span>
                <span className="text-right truncate">{a.name}</span>
                <span className="text-right truncate">{b.name}</span>
                <span className="text-right">Diff</span>
              </div>
              <ResultDiffRow label="Target" valueA={rA.targetAmount} valueB={rB.targetAmount} format="currency" />
              <ResultDiffRow label="Reach" valueA={rA.reachAge} valueB={rB.reachAge} format="age" />
              <ResultDiffRow label="Monthly" valueA={rA.monthlyPassiveIncome} valueB={rB.monthlyPassiveIncome} format="currency" />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

export function ScenarioComparison({ scenarios, onBack }: ScenarioComparisonProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <h2 className="text-3xl font-bold">
          {scenarios[0].name} vs {scenarios[1].name}
        </h2>
      </div>

      <div className="rounded-xl border bg-card p-4 md:p-6">
        <h3 className="text-2xl font-semibold mb-3">Net Worth Timeline</h3>
        <ComparisonChart scenarios={scenarios} />
      </div>

      <div>
        <h3 className="text-2xl font-semibold mb-3">FIRE Numbers Comparison</h3>
        <ComparisonTable scenarios={scenarios} />
      </div>
    </div>
  );
}
