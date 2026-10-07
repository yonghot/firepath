'use client';

import { formatCurrencyFull, formatIsoDate } from '@/lib/utils/format';

export function Stable() {
  return (
    <p>
      <time dateTime="2026-06-29">{formatIsoDate('2026-06-29')}</time> {formatCurrencyFull(1234567)}
    </p>
  );
}
