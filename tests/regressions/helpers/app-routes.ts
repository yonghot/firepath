import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';

const APP_ROOT = path.resolve(__dirname, '../../../src/app');
const ROUTE_FILE = /^(page|route)\.(tsx?|jsx?)$/;
const METADATA_ROUTES = new Map([
  ['sitemap', '/sitemap.xml'],
  ['robots', '/robots.txt'],
]);

function walk(dir: string, segments: string[], acc: Set<string>): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const stem = entry.name.replace(/\.(tsx?|jsx?)$/, '');
      if (ROUTE_FILE.test(entry.name) && !segments.some((s) => s.startsWith('['))) {
        acc.add('/' + segments.join('/'));
      } else if (METADATA_ROUTES.has(stem) && segments.length === 0) {
        acc.add(METADATA_ROUTES.get(stem) as string);
      }
      continue;
    }
    if (!entry.isDirectory()) continue;
    const name = entry.name;
    const isGroup = /^\(.+\)$/.test(name);
    walk(path.join(dir, name), isGroup ? segments : [...segments, name], acc);
  }
}

let cached: Set<string> | null = null;

export function staticRoutes(): Set<string> {
  if (!cached) {
    cached = new Set();
    walk(APP_ROOT, [], cached);
    const normalised = new Set<string>();
    for (const route of cached) normalised.add(route === '/' ? '/' : route.replace(/\/$/, ''));
    cached = normalised;
  }
  return cached;
}

export function hasStaticRoute(pathname: string): boolean {
  const clean = pathname.split('#')[0].split('?')[0];
  return staticRoutes().has(clean === '' ? '/' : clean);
}

const PUBLIC_ROOT = path.resolve(__dirname, '../../../public');
const UNVERIFIABLE_DYNAMIC = new Set(['[indexnowKey]', 'guide/[slug]']);

function collectPatterns(dir: string, segments: string[], acc: string[][]): void {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isFile()) {
      const stem = entry.name.replace(/\.(tsx?|jsx?)$/, '');
      if (ROUTE_FILE.test(entry.name)) acc.push(segments);
      else if (METADATA_ROUTES.has(stem) && segments.length === 0) acc.push([stem === 'sitemap' ? 'sitemap.xml' : 'robots.txt']);
      continue;
    }
    if (!entry.isDirectory()) continue;
    const isGroup = /^\(.+\)$/.test(entry.name);
    collectPatterns(path.join(dir, entry.name), isGroup ? segments : [...segments, entry.name], acc);
  }
}

let patterns: string[][] | null = null;

export function resolvesToRoute(pathname: string): boolean {
  if (!patterns) {
    patterns = [];
    collectPatterns(APP_ROOT, [], patterns);
    patterns = patterns.filter((p) => !UNVERIFIABLE_DYNAMIC.has(p.join('/')));
  }
  const clean = pathname.split('#')[0].split('?')[0];
  const parts = clean.split('/').filter(Boolean);
  if (existsSync(path.join(PUBLIC_ROOT, ...parts)) && parts.length > 0) return true;
  return patterns.some(
    (pattern) =>
      pattern.length === parts.length &&
      pattern.every((segment, i) => segment === parts[i] || (segment.startsWith('[') && !segment.startsWith('[...'))),
  );
}
