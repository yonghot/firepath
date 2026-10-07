import { PUBLISHER } from '@/lib/site';
import { getListedContentPages, pageUrl } from '@/lib/indexable-pages';

export const dynamic = 'force-static';

export function GET(): Response {
  const pages = getListedContentPages().map((page) => `- [${page.title}](${pageUrl(page.canonicalPath)}): ${page.description}`);
  const body = [
    '# FIREPath',
    '',
    '> Free FIRE (financial independence, retire early) calculator that compares Lean, Regular, Fat, Coast and Barista FIRE on one timeline, with guides and the sources behind its default assumptions.',
    '',
    `Published by ${PUBLISHER.name} (${PUBLISHER.url}). Corrections: ${PUBLISHER.email}.`,
    '',
    '## Pages',
    '',
    ...pages,
    '',
  ].join('\n');
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
