/**
 * SourcesReferences — a reusable "Sources & References" block for content pages.
 *
 * Renders a numbered list of citations with clickable external links.
 * All href values must come from the verified brief; never invent a URL.
 */

export interface SourceItem {
  id: number;
  label: string;
  url: string;
  /** Short description of what the source supports */
  note: string;
}

interface SourcesReferencesProps {
  sources: SourceItem[];
  className?: string;
}

export function SourcesReferences({ sources, className }: SourcesReferencesProps) {
  return (
    <section
      aria-label="Sources and references"
      className={`mt-10 border-t border-border pt-8 ${className ?? ''}`}
    >
      <h2 className="text-xl font-semibold mb-4">Sources &amp; References</h2>
      <ol role="list" className="space-y-3 text-sm text-muted-foreground list-none p-0">
        {sources.map((s) => (
          <li key={s.id} className="flex gap-2">
            <span className="shrink-0 font-medium text-foreground tabular-nums">[{s.id}]</span>
            <span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-foreground underline underline-offset-2 hover:text-primary transition-colors duration-150"
              >
                {s.label}
              </a>
              {s.note ? <span className="ml-1">— {s.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
