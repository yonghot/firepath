'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, PieChart as PieChartIcon, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { PortfolioChart, PortfolioLegend } from './portfolio-chart';
import { PortfolioGrowthChart } from './portfolio-results';
import { PortfolioProfileSelector } from './portfolio-profile-selector';
import { PortfolioMetricsCard } from './portfolio-metrics-card';
import { optimizePortfolio, RISK_PROFILE_DESCRIPTIONS } from '@/lib/engine/portfolio-optimizer';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import type { RiskProfile } from '@/lib/engine/portfolio-optimizer';
import Link from 'next/link';

interface PortfolioPanelProps {
  input: FIREInput;
  results: FIREOutput['results'];
  isPremium?: boolean;
}

function PremiumGate() {
  return (
    <Card className="border-dashed border-2 border-muted">
      <CardContent className="p-6 text-center space-y-3">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <Crown className="h-6 w-6 text-amber-600" />
        </div>
        <h3 className="text-2xl font-semibold">Portfolio Optimization</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Get personalized asset allocation recommendations based on your FIRE timeline,
          age, and risk profile. Compare Conservative, Moderate, and Aggressive strategies.
        </p>
        <Link href="/premium">
          <Button className="mt-2">
            <Crown className="h-4 w-4 mr-2" />
            Unlock with Premium
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}

function PanelHeader({ hasRun, isRunning, onRun }: { hasRun: boolean; isRunning: boolean; onRun: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h2 className="text-3xl font-bold">Portfolio Optimization</h2>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <Info className="h-4 w-4 text-muted-foreground" />
            </TooltipTrigger>
            <TooltipContent className="max-w-xs">
              <p>Analyzes optimal asset allocation based on your age, time to FIRE, and risk tolerance using Modern Portfolio Theory principles.</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <Button variant="outline" size="sm" onClick={onRun} disabled={isRunning}>
        <PieChartIcon className="h-4 w-4 mr-1" />
        {hasRun ? 'Recalculate' : 'Optimize'}
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <Card className="border-dashed">
      <CardContent className="p-8 text-center">
        <PieChartIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          Click &quot;Optimize&quot; to get personalized asset allocation recommendations
          for your FIRE journey.
        </p>
      </CardContent>
    </Card>
  );
}

export function PortfolioPanel({ input, results, isPremium = false }: PortfolioPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<RiskProfile | null>(null);

  const portfolioResult = useMemo(() => {
    if (!hasRun) return null;
    return optimizePortfolio(input, results);
  }, [input, results, hasRun]);

  const handleRun = () => {
    setIsRunning(true);
    requestAnimationFrame(() => {
      setHasRun(true);
      setIsRunning(false);
      setSelectedProfile(null);
    });
  };

  const activeProfile = selectedProfile ?? portfolioResult?.recommended ?? 'moderate';
  const activePortfolio = portfolioResult?.portfolios.find((p) => p.profile === activeProfile);

  if (!isPremium) return <PremiumGate />;

  return (
    <div className="space-y-4">
      <PanelHeader hasRun={hasRun} isRunning={isRunning} onRun={handleRun} />

      {portfolioResult && activePortfolio ? (
        <>
          <PortfolioProfileSelector
            portfolios={portfolioResult.portfolios}
            activeProfile={activeProfile}
            recommended={portfolioResult.recommended}
            onSelect={setSelectedProfile}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-2xl font-semibold mb-1">{activePortfolio.label} Allocation</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {RISK_PROFILE_DESCRIPTIONS[activeProfile]}
              </p>
              <PortfolioChart portfolio={activePortfolio} />
              <PortfolioLegend portfolio={activePortfolio} />
            </div>

            <PortfolioMetricsCard portfolio={activePortfolio} inflation={input.inflation} />
          </div>

          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="text-2xl font-semibold mb-1">Projected Growth by Strategy</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Comparison of portfolio strategies over time. Recommended strategy shown with solid line.
            </p>
            <PortfolioGrowthChart
              projectedGrowth={portfolioResult.projectedGrowth}
              recommended={portfolioResult.recommended}
            />
          </div>
        </>
      ) : (
        <EmptyState />
      )}
    </div>
  );
}
