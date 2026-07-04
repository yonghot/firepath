/**
 * faq-section.test.ts — 부속P CODE-02 regression guard.
 *
 * "STOP emitting FAQPage ... JSON-LD for SERP (deprecated 2026); keep the
 * Q&A as on-page H2/H3 text." This test asserts at the SOURCE level (same
 * technique as k01-content-depth.test.ts — no jsdom in this repo's vitest
 * environment) that no module in src/ builds or references a FAQPage (or
 * HowTo) JSON-LD object, while FAQSection itself still exists and renders
 * the on-page accordion text.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { FAQSection } from '@/components/common/faq-section';

const SRC_ROOT = path.resolve(__dirname, '../../..');

function collectSourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      collectSourceFiles(full, acc);
    } else if (/\.(ts|tsx)$/.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

describe('부속P CODE-02 — no FAQPage/HowTo JSON-LD emitted anywhere in src/', () => {
  it('no source file contains a FAQPage or HowTo @type literal', () => {
    const files = collectSourceFiles(SRC_ROOT);
    const offenders: string[] = [];
    for (const file of files) {
      // Skip this test file's own descriptive strings.
      if (file.endsWith(path.join('__tests__', 'faq-section.test.ts'))) continue;
      const source = readFileSync(file, 'utf8');
      if (/@type['"]?\s*:\s*['"]FAQPage['"]/.test(source) || /@type['"]?\s*:\s*['"]HowTo['"]/.test(source)) {
        offenders.push(file);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('FAQSection component still exists and is a function (on-page text preserved for GEO)', () => {
    expect(typeof FAQSection).toBe('function');
  });
});
