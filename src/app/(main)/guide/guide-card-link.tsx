'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { trackEvent } from '@/lib/analytics';

export function GuideCardLink({ href, className, children }: { href: string; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => trackEvent('related_click', { link_module: 'hub', link_url: href })}
    >
      {children}
    </Link>
  );
}
