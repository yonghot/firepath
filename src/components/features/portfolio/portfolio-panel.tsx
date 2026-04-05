'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, PieChart as PieChartIcon, Info, CheckCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { PortfolioChart, PortfolioLegend } from './portfolio-chart';
import { PortfolioGrowthChart } from './portfolio-results';
import { optimizePortfolio } from '@/lib/engine/portfolio-optimizer';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import type { RiskProfile } from '@/lib/engine/portfolio-optimizer';
import Link from 'next/link';

interface PortfolioPanelProps {
  input: FIREInput;
  results: FIREOutput['results'];
  isPremium?: boolean;
}

const PROFILE_DESCRIPTIONS: Record<RiskProfile, string> = {
  conservative: 'Lower risk, steadier growth. Best for shorter time horizons or risk-averse investors.',
  moderate: 'Balanced risk and return. Suitable for most FIRE seekers with 10+ year horizons.',
  aggressive: 'Higher risk, higher potential return. Best for young investors with 15+ years to FIRE.',
};

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

  if (!isPremium) {
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

  return (
    <div className="space-y-4">
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
        <Button
          variant="outline"
          size="sm"
          onClick={handleRun}
          disabled={isRunning}
        >
          <PieChartIcon className="h-4 w-4 mr-1" />
          {hasRun ? 'Recalculate' : 'Optimize'}
        </Button>
      </div>

      {portfolioResult && activePortfolio ? (
        <>
          {/* Portfolio selector */}
          <div className="grid grid-cols-3 gap-3">
            {portfolioResult.portfolios.map((p) => {
              const isActive = p.profile === activeProfile;
              const isRecommended = p.profile === portfolioResult.recommended;
              return (
                <button
                  key={p.profile}
                  onClick={() => setSelectedProfile(p.profile)}
                  className={`relative rounded-xl border p-3 text-left transition-all duration-200 ${
                    isActive
                      ? 'border-primary bg-primary/5 shadow-sm'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  {isRecommended && (
                    <span className="absolute -top-2 right-2 inline-flex items-center gap-0.5 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
                      <CheckCircle className="h-2.5 w-2.5" />
                      Rec.
                    </span>
                  )}
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Return: <span className="font-mono">{(p.expectedReturn * 100).toFixed(1)}%</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Risk: <span className="font-mono">{(p.volatility * 100).toFixed(1)}%</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Sharpe: <span className="font-mono">{p.sharpeRatio.toFixed(2)}</span>
                  </p>
                </button>
              );
            })}
          </div>

          {/* Active portfolio detail */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-2xl font-semibold mb-1">{activePortfolio.label} Allocation</h3>
              <p className="text-xs text-muted-foreground mb-3">
                {PROFILE_DESCRIPTIONS[activeProfile]}
              </p>
              <PortfolioChart portfolio={activePortfolio} />
              <PortfolioLegend portfolio={activePortfolio} />
            </div>

            <div className="rounded-xl border bg-card p-4">
              <h3 className="text-2xl font-semibold mb-1">Portfolio Metrics</h3>
              <div className="space-y-3 mt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Expected Annual Return</span>
                  <span className="font-mono font-semibold text-sm">
                    {(activePortfolio.expectedReturn * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Annual Volatility (Risk)</span>
                  <span className="font-mono font-semibold text-sm">
                    {(activePortfolio.volatility * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Sharpe Ratio</span>
                  <span className="font-mono font-semibold text-sm">
                    {activePortfolio.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Real Return (after inflation)</span>
                  <span className="font-mono font-semibold text-sm">
                    {(((1 + activePortfolio.expectedReturn) / (1 + input.inflation) - 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Growth projection chart */}
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
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <PieChartIcon className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Optimize&quot; to get personalized asset allocation recommendations
              for your FIRE journey.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
