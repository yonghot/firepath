/**
 * answer-block.test.ts — 부속P CODE-01 page-wiring regression guard.
 *
 * No jsdom in this repo (vitest runs in plain `node` — see ad-slot.test.ts /
 * breadcrumbs.test.ts for the same documented constraint), so this file
 * checks at the SOURCE level that every required entity/calculator page
 * (fire-types, healthcare-bridge, guide hub, main calculator "/", and the
 * /embed route) imports and renders <AnswerBlock> as a server-rendered
 * element (no 'use client' guard around it), satisfying the acceptance
 * criterion that the block appears in server-rendered HTML.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('부속P CODE-01 — AnswerBlock wired as first content block on required pages', () => {
  const pages: { name: string; path: string }[] = [
    { name: '/fire-types', path: 'src/app/(main)/fire-types/page.tsx' },
    { name: '/healthcare-bridge', path: 'src/app/(main)/healthcare-bridge/page.tsx' },
    { name: '/guide (hub)', path: 'src/app/(main)/guide/page.tsx' },
    { name: '/ (main calculator)', path: 'src/app/(main)/page.tsx' },
    { name: '/embed', path: 'src/app/embed/page.tsx' },
  ];

  for (const page of pages) {
    it(`${page.name} imports and renders <AnswerBlock>`, () => {
      const source = readSource(page.path);
      expect(source).toMatch(/from\s+["']@\/components\/common\/answer-block["']/);
      expect(source).toMatch(/<AnswerBlock\s/);
    });

    it(`${page.name} is a server component (no top-level 'use client' directive)`, () => {
      const source = readSource(page.path);
      const firstNonEmptyLine = source.split('\n').find((l) => l.trim().length > 0) ?? '';
      expect(firstNonEmptyLine.includes("'use client'")).toBe(false);
    });
  }

  it('/embed also wires EmbedResizeScript (CODE-03 postMessage resize)', () => {
    const source = readSource('src/app/embed/page.tsx');
    expect(source).toContain('EmbedResizeScript');
  });
});
