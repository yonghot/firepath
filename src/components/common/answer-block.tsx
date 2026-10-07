/**
 * AnswerBlock — server-rendered GEO passage (부속P CODE-01).
 *
 * Renders a GeoAnswerEntity (src/lib/seo/geo.ts) as the FIRST content block
 * on an entity/calculator page: query-phrased H2, 40-60 word answer
 * paragraph, a compact data table, a cost/factor list, and a freshness
 * marker. Pure server component (no 'use client', no hooks) so every
 * element lands in the initial server-rendered HTML — verifiable via
 * `curl` with JS disabled, per the CODE-01 acceptance criteria.
 *
 * Neutral tone only: this component does not add any superlative/promotional
 * wrapper copy — it renders exactly the strings the caller supplies via
 * `entity`, which must already be neutral (부속P CODE-01 "no promotional/
 * superlative tone" requirement enforced at the call site, not here).
 */

import type { GeoAnswerEntity } from '@/lib/seo/geo';
import { formatIsoDate } from '@/lib/utils/format';

interface AnswerBlockProps {
  entity: GeoAnswerEntity;
  /** Distinguishes multiple answer blocks' heading ids on one page. */
  idPrefix?: string;
  className?: string;
  /** Heading, answer, date and sources only: no table or factor list (for a hub that links to the pages carrying them). */
  summaryOnly?: boolean;
}

export function AnswerBlock({ entity, idPrefix = 'geo-answer', className, summaryOnly = false }: AnswerBlockProps) {
  const { query, answer, lastUpdated, tableHeaders, tableRows, factors, stats } = entity;

  return (
    <section
      aria-labelledby={`${idPrefix}-heading`}
      className={`rounded-xl border bg-card p-6 space-y-4 ${className ?? ''}`}
    >
      <h2 id={`${idPrefix}-heading`} className="text-2xl font-bold">
        {query}
      </h2>

      <p className="text-base leading-relaxed">{answer}</p>

      <p className="text-xs text-muted-foreground">
        Updated{' '}
        <time dateTime={lastUpdated} className="font-medium text-foreground">
          {formatIsoDate(lastUpdated)}
        </time>
        .
      </p>

      {summaryOnly ? null : (
      <div className="overflow-x-auto">
        <table className="w-full text-sm border-collapse">
          <caption className="sr-only">Data breakdown for {query}</caption>
          <thead>
            <tr className="border-b border-border">
              {tableHeaders.map((h) => (
                <th
                  key={h}
                  scope="col"
                  className="text-left font-semibold py-2 pr-4 text-xs uppercase tracking-wide text-muted-foreground"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.label} className="border-b border-border/60">
                <th scope="row" className="text-left font-medium py-2 pr-4 tabular-nums">
                  {row.label}
                </th>
                {row.values.map((v, i) => (
                  <td key={i} className="py-2 pr-4 tabular-nums">
                    {v}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {summaryOnly ? null : (
      <div>
        <h3 className="text-sm font-semibold mb-2">Factors that affect this number</h3>
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {factors.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
      )}

      <ul className="space-y-1 text-xs text-muted-foreground border-t border-border pt-3">
        {stats.map((s, i) => (
          <li key={i}>
            {s.text} —{' '}
            {s.sourceUrl ? (
              <a
                href={s.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="underline underline-offset-2 hover:text-foreground"
              >
                {s.sourceLabel}
              </a>
            ) : (
              <span>{s.sourceLabel}</span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
