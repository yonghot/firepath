'use client';

/**
 * "Clear my data" control (부속I T16).
 *
 * Wipes every `cc_*` localStorage key (calculator-input saves, the recent-
 * calculations index, and the internal-traffic marker) — the visible
 * counterpart users need alongside auto-persistence. Reloads the page after
 * clearing so any currently-rendered "Continue where you left off" banner /
 * "Recent calculations" list disappears immediately rather than showing
 * stale state until next navigation.
 */

import { useState } from 'react';
import { clearAllCalculatorData } from '@/hooks/use-calculator-persistence';
import { toast } from 'sonner';

export function ClearMyDataLink({ className }: { className?: string }) {
  const [cleared, setCleared] = useState(false);

  const handleClick = () => {
    clearAllCalculatorData();
    setCleared(true);
    toast.success('Saved calculator data cleared.');
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={cleared}
      className={
        className ??
        'flex min-h-11 items-center text-left text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 disabled:opacity-60'
      }
    >
      {cleared ? 'Data cleared' : 'Clear my saved calculator data'}
    </button>
  );
}
