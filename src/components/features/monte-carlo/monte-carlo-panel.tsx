'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import Link from 'next/link';

// Lazy-load premium content: heavy engine + charts stay out of the main bundle
// until a user upgrades, which today is nobody. Keeps free-path JS lean.
const MonteCarloContent = dynamic(
  () => import('./monte-carlo-content').then((m) => m.MonteCarloContent),
  {
    ssr: false,
    loading: () => (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading simulation…</p>
        </CardContent>
      </Card>
    ),
  }
);

interface MonteCarloPanelProps {
  input: FIREInput;
  results: FIREOutput['results'];
  isPremium?: boolean;
}

function MonteCarloGate() {
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

export function MonteCarloPanel({ input, results, isPremium = false }: MonteCarloPanelProps) {
  if (!isPremium) return <MonteCarloGate />;
  return <MonteCarloContent input={input} results={results} />;
}
