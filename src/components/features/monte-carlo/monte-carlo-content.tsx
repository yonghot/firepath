'use client';

import { useMemo, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dices, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import { MonteCarloChart } from './monte-carlo-chart';
import { MonteCarloResults } from './monte-carlo-results';
import { runMonteCarlo } from '@/lib/engine/monte-carlo';
import type { FIREInput, FIREOutput } from '@/types/fire.types';

interface MonteCarloContentProps {
  input: FIREInput;
  results: FIREOutput['results'];
}

export function MonteCarloContent({ input, results }: MonteCarloContentProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const mcResult = useMemo(() => {
    if (!hasRun) return null;
    return runMonteCarlo(input, { simulations: 1000, volatility: 0.15 });
  }, [input, hasRun]);

  const handleRun = () => {
    setIsRunning(true);
    requestAnimationFrame(() => {
      setHasRun(true);
      setIsRunning(false);
    });
  };

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
