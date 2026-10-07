import { NextStepLink } from '@/components/common/next-step-link';
import { NEXT_STEP_HEADING, type NextStepItem } from '@/lib/next-steps';

export function NextStep({
  items,
  embedded,
  className,
}: {
  items: NextStepItem[];
  embedded?: boolean;
  className?: string;
}) {
  if (items.length === 0) return null;
  return (
    <section data-next-step="true" aria-labelledby="next-step-heading" className={className}>
      <h2 id="next-step-heading" className="mb-3 text-xl font-semibold">
        {NEXT_STEP_HEADING}
      </h2>
      <ul className="grid gap-3 md:grid-cols-3">
        {items.map((item) => (
          <li key={item.slot}>
            <NextStepLink
              item={item}
              embedded={embedded}
              className="flex h-full min-h-11 flex-col gap-1 rounded-xl border bg-card p-4 shadow-sm transition-shadow duration-200 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="text-base font-medium underline underline-offset-4">{item.title}</span>
              <span className="text-sm text-muted-foreground">{item.reason}</span>
            </NextStepLink>
          </li>
        ))}
      </ul>
    </section>
  );
}
