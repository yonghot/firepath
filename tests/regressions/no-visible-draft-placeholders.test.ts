import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { PAGE_LOADERS, preloadPages, renderPage } from './helpers/render-pages';

const SRC = join(__dirname, '..', '..', 'src');
const DRAFT_PHRASES: RegExp[] = [
  /TO BE DETERMINED/i,
  /to be specified by (counsel|the operator)/i,
  /lorem ipsum/i,
  /coming soon/i,
  /launching soon/i,
  /note to operator/i,
  /(legal |clinical )?reviewer pending/i,
  /planned for a future release/i,
  /has not yet been engaged/i,
  /we plan to add/i,
  /placeholders? (pending|rules|values)/i,
  /pending verification/i,
  /\bDRAFT\b/,
  /\[(STATE|VENUE|PROVINCE)\b[^\]]*\]/,
];

function draftCopy(text: string): string | null {
  for (const pattern of DRAFT_PHRASES) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

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

await preloadPages();

describe('K1/K30: no visible draft or placeholder copy', () => {
  const files = ['app', 'components', 'lib'].flatMap((dir) => sourceFiles(join(SRC, dir)));

  it('scans a non-trivial set of sources', () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it('no shipped source contains draft vocabulary or bracketed jurisdiction tokens', () => {
    const hits = files
      .map((file) => ({ file, match: draftCopy(stripComments(readFileSync(file, 'utf8'))) }))
      .filter((hit) => hit.match)
      .map((hit) => `${hit.file.slice(SRC.length + 1)}: ${hit.match}`);
    expect(hits).toEqual([]);
  });

  it('no OPERATOR NOTE marker is left in shipped source, comments included', () => {
    const hits = files
      .filter((file) => /OPERATOR NOTE/.test(readFileSync(file, 'utf8')))
      .map((file) => file.slice(SRC.length + 1));
    expect(hits).toEqual([]);
  });

  for (const path of Object.keys(PAGE_LOADERS)) {
    it(`${path}: rendered page and JSON-LD carry no draft vocabulary`, async () => {
      expect(draftCopy(await renderPage(path))).toBeNull();
    });
  }

  it('draft vocabulary is detected', () => {
    for (const sample of [
      'Note to operator: add the entity',
      'Venue to be specified by counsel',
      'legal reviewer pending',
      'clinical reviewer pending',
      'reviewer pending',
      'planned for a future release',
      'The firm has not yet been engaged',
      'we plan to add a state table',
      'placeholder values for now',
      'placeholders pending review',
      'figures are pending verification',
      'DRAFT',
      'Guides are coming soon.',
      '[STATE]',
    ]) {
      expect(draftCopy(sample), sample).not.toBeNull();
    }
  });

  it('legitimate wording is not flagged', () => {
    for (const sample of [
      'The 2027 limits will be available after the announcement',
      'The date is to be announced',
      'Bring a pay stub',
      'The window has not yet extended; not yet extended',
      'We drafted this page and are drafting the next one',
      'a stub of the budget',
      'a future release of the browser',
      'The estimated placeholder is gone',
    ]) {
      expect(draftCopy(sample), sample).toBeNull();
    }
  });
});
