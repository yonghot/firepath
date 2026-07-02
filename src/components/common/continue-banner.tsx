'use client';

/**
 * ContinueBanner — dismissible "Continue where you left off" prompt (부속I T16).
 *
 * Rendered above the calculator when useCalculatorPersistence() finds a
 * saved state from a previous visit. Applying restores inputs and fires
 * state_restored (handled by the hook); dismissing leaves the saved state
 * untouched in storage (shown again next visit) without hydrating inputs.
 */

import { History, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ContinueBannerProps {
  onApply: () => void;
  onDismiss: () => void;
  className?: string;
}

export function ContinueBanner({ onApply, onDismiss, className }: ContinueBannerProps) {
  return (
    <div
      role="status"
      className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-muted/40 px-4 py-3 ${className ?? ''}`}
    >
      <div className="flex items-center gap-2 text-sm">
        <History className="h-4 w-4 shrink-0 text-[var(--brand-primary)]" aria-hidden="true" />
        <span>Continue where you left off?</span>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onApply}>
          Restore
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          aria-label="Dismiss continue-where-you-left-off banner"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}
