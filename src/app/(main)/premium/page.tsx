'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, X, Crown } from 'lucide-react';

const FEATURES = [
  { name: 'FIRE Calculator', free: true, premium: true },
  { name: 'Timeline Chart', free: true, premium: true },
  { name: 'URL Sharing', free: true, premium: true },
  { name: 'Save Calculations', free: '5 max', premium: 'Unlimited' },
  { name: 'Scenario Comparison', free: '2 max', premium: 'Unlimited' },
  { name: 'Monte Carlo Simulation', free: false, premium: true },
  { name: 'Portfolio Optimization', free: false, premium: true },
  { name: 'Inflation Scenarios', free: false, premium: true },
  { name: 'PDF Reports', free: false, premium: true },
  { name: 'Ad-Free Experience', free: false, premium: true },
];

function FeatureCheck({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-muted-foreground">{value}</span>;
  }
  return value ? (
    <Check className="h-4 w-4 text-green-500" />
  ) : (
    <X className="h-4 w-4 text-muted-foreground/50" />
  );
}

export default function PremiumPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <div className="text-center mb-10">
        <Badge className="mb-3" variant="secondary">
          <Crown className="h-3 w-3 mr-1" />
          Premium
        </Badge>
        <h1 className="text-3xl font-bold">Unlock Your Full FIRE Potential</h1>
        <p className="text-muted-foreground mt-2">
          Advanced simulations and unlimited saves for serious FIRE planners.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Free tier */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Free</CardTitle>
            <p className="text-3xl font-bold">$0</p>
          </CardHeader>
          <CardContent className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.name} className="flex items-center justify-between">
                <span className="text-sm">{f.name}</span>
                <FeatureCheck value={f.free} />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Premium tier */}
        <Card className="border-primary relative">
          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
            <Badge>Most Popular</Badge>
          </div>
          <CardHeader>
            <CardTitle className="text-lg">Premium</CardTitle>
            <p className="text-3xl font-bold">
              $4.99<span className="text-sm font-normal text-muted-foreground">/month</span>
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {FEATURES.map((f) => (
              <div key={f.name} className="flex items-center justify-between">
                <span className="text-sm">{f.name}</span>
                <FeatureCheck value={f.premium} />
              </div>
            ))}
            <Button className="w-full mt-4">
              <Crown className="h-4 w-4 mr-2" />
              Get Premium
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
