'use client';

import { CheckCircle } from 'lucide-react';
import type { PortfolioAllocation, RiskProfile } from '@/lib/engine/portfolio-optimizer';

interface PortfolioProfileSelectorProps {
  portfolios: PortfolioAllocation[];
  activeProfile: RiskProfile;
  recommended: RiskProfile;
  onSelect: (profile: RiskProfile) => void;
}

export function PortfolioProfileSelector({
  portfolios,
  activeProfile,
  recommended,
  onSelect,
}: PortfolioProfileSelectorProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {portfolios.map((p) => {
        const isActive = p.profile === activeProfile;
        const isRecommended = p.profile === recommended;
        return (
          <button
            key={p.profile}
            onClick={() => onSelect(p.profile)}
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
  );
}
