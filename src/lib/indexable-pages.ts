import { getIndexablePages, type ContentPage } from '@/lib/content-pages';
import { isNoindexed } from '@/lib/noindex-paths';
import { SITE_URL } from '@/lib/site';

export function getListedContentPages(): ContentPage[] {
  const seen = new Set<string>();
  return getIndexablePages().filter((page) => {
    if (seen.has(page.canonicalPath) || isNoindexed(page.canonicalPath)) return false;
    seen.add(page.canonicalPath);
    return true;
  });
}

export function pageUrl(canonicalPath: string): string {
  return canonicalPath === '/' ? SITE_URL : `${SITE_URL}${canonicalPath}`;
}
