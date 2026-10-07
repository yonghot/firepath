'use client';

export function ZoneSensitiveDate() {
  return <time dateTime="2026-06-29">{new Date('2026-06-29').toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</time>;
}
