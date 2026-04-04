'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Dices, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MonteCarloChart } from './monte-carlo-chart';
import { MonteCarloResults } from './monte-carlo-results';
import { runMonteCarlo } from '@/lib/engine/monte-carlo';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import Link from 'next/link';

interface MonteCarloPanelProps {
  input: FIREInput;
  results: FIREOutput['results'];
  isPremium?: boolean;
}

export function MonteCarloPanel({ input, results, isPremium = false }: MonteCarloPanelProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const mcResult = useMemo(() => {
    if (!hasRun) return null;
    return runMonteCarlo(input, { simulations: 1000, volatility: 0.15 });
  }, [input, hasRun]);

  const handleRun = () => {
    setIsRunning(true);
    // Small delay to show loading state
    requestAnimationFrame(() => {
      setHasRun(true);
      setIsRunning(false);
    });
  };

  if (!isPremium) {
    return (
      <Card className="border-dashed border-2 border-muted">
        <CardContent className="p-6 text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30">
            <Crown className="h-6 w-6 text-amber-600" />
          </div>
          <h3 className="text-2xl font-semibold">Monte Carlo Simulation</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Run 1,000 market simulations to see the probability of reaching each FIRE type.
            Account for market volatility and uncertainty in your retirement planning.
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
          <h2 className="text-3xl font-bold">Monte Carlo Simulation</h2>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-4 w-4 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>Runs 1,000 simulations with randomized annual returns (15% volatility) to estimate the probability of achieving each FIRE type.</p>
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
          <Dices className="h-4 w-4 mr-1" />
          {hasRun ? 'Re-run' : 'Run Simulation'}
        </Button>
      </div>

      {mcResult ? (
        <>
          <div className="rounded-xl border bg-card p-4 md:p-6">
            <h3 className="text-2xl font-semibold mb-3">Wealth Projection (1,000 simulations)</h3>
            <p className="text-xs text-muted-foreground mb-4">
              Shaded areas show 10th–90th percentile range. Dashed lines are FIRE targets.
            </p>
            <MonteCarloChart percentiles={mcResult.percentiles} results={results} />
          </div>

          <div>
            <h3 className="text-2xl font-semibold mb-3">Success Probability</h3>
            <MonteCarloResults result={mcResult} />
          </div>
        </>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center">
            <Dices className="h-8 w-8 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Run Simulation&quot; to see how market volatility affects your FIRE journey.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
