import { readFileSync, readdirSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = resolve(__dirname, '..', '..');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '__tests__' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

const isClientFile = (src: string) => /^\s*(\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(src);

describe('server code never calls the client-only Supabase module (next build prerender error on /embed-this)', () => {
  const files = [...walk(join(ROOT, 'src', 'app')), ...walk(join(ROOT, 'src', 'components'))];

  it('no server component or route imports from @/lib/supabase/client', () => {
    const offenders = files
      .filter((f) => !isClientFile(readFileSync(f, 'utf8')))
      .filter((f) => /from ['"]@\/lib\/supabase\/client['"]/.test(readFileSync(f, 'utf8')))
      .map((f) => relative(ROOT, f));
    expect(offenders).toEqual([]);
  });

  it('the shared configuration check lives in a module without the client directive', () => {
    const src = readFileSync(join(ROOT, 'src', 'lib', 'supabase', 'config.ts'), 'utf8');
    expect(isClientFile(src)).toBe(false);
    expect(src).toMatch(/export function isSupabaseConfigured/);
  });
});
