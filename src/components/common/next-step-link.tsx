'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';
import { embedLinkProps } from '@/lib/embed-links';
import type { NextStepItem } from '@/lib/next-steps';

export function NextStepLink({
  item,
  embedded,
  className,
  children,
}: {
  item: NextStepItem;
  embedded?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={item.href}
      {...embedLinkProps(embedded)}
      className={className}
      onClick={() => trackEvent('related_click', { link_module: 'next_step', link_context: item.slot, link_url: item.path })}
    >
      {children}
    </Link>
  );
}
