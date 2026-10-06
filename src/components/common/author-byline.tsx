import { Building2 } from 'lucide-react';
import { PUBLISHER } from '@/lib/site';
import { formatIsoDate } from '@/lib/utils/format';

export function AuthorByline({
  lastUpdated,
  className,
}: {
  /** ISO date of the page's last real content change (the page registry date), e.g. "2026-10-07". */
  lastUpdated: string;
  className?: string;
}) {
  const formatted = formatIsoDate(lastUpdated);

  return (
    <div
      className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground ${className ?? ''}`}
    >
      <Building2 className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>
        Published by <strong className="text-foreground">{PUBLISHER.name}</strong>
      </span>
      <span aria-hidden="true">·</span>
      <span>
        Updated{' '}
        <time dateTime={lastUpdated}>{formatted}</time>
      </span>
      <span aria-hidden="true">·</span>
      <span className="italic">Educational information. Not reviewed by a licensed financial professional.</span>
    </div>
  );
}
