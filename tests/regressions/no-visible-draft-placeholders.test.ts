import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SRC = join(__dirname, '..', '..', 'src');
const PLACEHOLDER_PHRASE = /TO BE DETERMINED|to be specified by counsel|lorem ipsum|coming soon|launching soon/i;
const PLACEHOLDER_TOKEN = /\[(STATE|VENUE|PROVINCE)\b[^\]]*\]/;

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === '__tests__' ? [] : sourceFiles(path);
    return /\.(tsx|ts)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

function stripComments(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

describe('K1: no visible draft or placeholder copy in shipped source', () => {
  const files = ['app', 'components', 'lib'].flatMap((dir) => sourceFiles(join(SRC, dir)));

  it('scans a non-trivial set of sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no shipped source contains placeholder phrases or bracketed jurisdiction tokens', () => {
    const hits = files
      .map((file) => {
        const src = stripComments(readFileSync(file, 'utf8'));
        return { file, match: src.match(PLACEHOLDER_PHRASE) ?? src.match(PLACEHOLDER_TOKEN) };
      })
      .filter((hit) => hit.match)
      .map((hit) => `${hit.file.slice(SRC.length + 1)}: ${hit.match![0]}`);
    expect(hits).toEqual([]);
  });
});
