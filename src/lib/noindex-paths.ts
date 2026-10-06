import entries from '@/data/noindex-paths.json';

function normalise(path: string): string {
  const clean = path.split('#')[0].split('?')[0].replace(/\/+$/, '');
  return clean === '' ? '/' : clean;
}

const NOINDEXED: ReadonlySet<string> = new Set(entries.map((entry) => normalise(entry.path)));

export function isNoindexed(path: string): boolean {
  return NOINDEXED.has(normalise(path));
}

export function robotsForPath(path: string): { index: false; follow: true } | undefined {
  return isNoindexed(path) ? { index: false, follow: true } : undefined;
}
