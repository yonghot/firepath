import { CalendarCheck } from 'lucide-react';
import { formatIsoDate } from '@/lib/utils/format';

export function UpdatedBadge({
  lastUpdated,
  className,
}: {
  /** ISO date of the page's last real content change (the page registry date). */
  lastUpdated: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium text-muted-foreground ${className ?? ''}`}
    >
      <CalendarCheck className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      Updated <time dateTime={lastUpdated}>{formatIsoDate(lastUpdated)}</time>
    </span>
  );
}
