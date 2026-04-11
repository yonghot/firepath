'use client';

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown } from 'lucide-react';
import type { FIREInput, FIREOutput } from '@/types/fire.types';
import Link from 'next/link';

// Lazy-load premium content: portfolio engine + charts + sub-components
// stay out of the main bundle until a user upgrades.
const PortfolioContent = dynamic(
  () => import('./portfolio-content').then((m) => m.PortfolioContent),
  {
    ssr: false,
    loading: () => (
      <Card className="border-dashed">
        <CardContent className="p-8 text-center">
          <p className="text-sm text-muted-foreground">Loading optimizer…</p>
        </CardContent>
      </Card>
    ),
  }
);

interface PortfolioPanelProps {
  input: FIREInput;
  results: FIREOutput['results'];
  isPremium?: boolean;
}

function PortfolioGate() {
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

export function PortfolioPanel({ input, results, isPremium = false }: PortfolioPanelProps) {
  if (!isPremium) return <PortfolioGate />;
  return <PortfolioContent input={input} results={results} />;
}
