import { BellRing } from 'lucide-react';
import { getRetirementLimitsState } from '@/lib/data/retirement-limits';

export function SeasonBadge({ className }: { className?: string }) {
  const { irs } = getRetirementLimitsState();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground ${className ?? ''}`}
    >
      <BellRing className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      IRS typically announces {irs.next.year} retirement limits in October or November — bookmark your plan
    </span>
  );
}
