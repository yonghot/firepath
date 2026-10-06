import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { Footer } from '@/components/layouts/footer';
import { FeedbackWidget } from '@/components/common/feedback-widget';
import { SiteChrome } from '@/components/layouts/site-chrome';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const SRC = path.resolve(__dirname, '../../src');

const USER_OPENED_BOTTOM_SURFACES: Record<string, string> = {
  'components/common/cookie-consent-banner.tsx':
    'cookie notice: opens only from the footer "Manage consent" link outside EEA/UK/CH (K14-a)',
  'components/common/feedback-widget.tsx':
    'feedback panel: opens only after the visitor clicks the footer "Send feedback" control',
  'components/ui/sheet.tsx':
    'generic side sheet: the header menu opens it with side="right"; the bottom variant is unused',
};

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      sourceFiles(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name) && !/\.test\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function stripComments(code: string): string {
  return code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
}

function fixedClassTokens(html: string): string[] {
  return [...html.matchAll(/class="([^"]*)"/g)]
    .map((m) => m[1])
    .filter((value) => value.split(/\s+/).includes('fixed'));
}

describe('K18: nothing is pinned to the bottom of the viewport on first paint', () => {
  it('the feedback widget renders no fixed element until the visitor opens it', () => {
    const html = renderToStaticMarkup(createElement(FeedbackWidget));
    expect(fixedClassTokens(html)).toEqual([]);
    expect(html).toContain('Send feedback');
  });

  it('the footer carries the Send feedback launcher', () => {
    const html = renderToStaticMarkup(createElement(Footer));
    expect(html).toContain('Send feedback');
    expect(fixedClassTokens(html)).toEqual([]);
  });

  it('the default shared chrome (header, main, footer, widget) has no fixed element', () => {
    const html = renderToStaticMarkup(
      createElement(SiteChrome, null, createElement('p', null, 'content')),
    );
    expect(fixedClassTokens(html)).toEqual([]);
    expect(html).not.toMatch(/Open feedback panel/);
  });

  it('only allow-listed user-opened surfaces combine fixed with a bottom-* offset', () => {
    const offenders: string[] = [];
    for (const file of sourceFiles(SRC)) {
      const code = stripComments(readFileSync(file, 'utf8'));
      if (!/\bfixed\b/.test(code) || !/bottom-/.test(code)) continue;
      const rel = path.relative(SRC, file).split(path.sep).join('/');
      if (!(rel in USER_OPENED_BOTTOM_SURFACES)) offenders.push(rel);
    }
    expect(offenders).toEqual([]);
  });

  it('the allow-list has no stale entries', () => {
    for (const rel of Object.keys(USER_OPENED_BOTTOM_SURFACES)) {
      const code = stripComments(readFileSync(path.join(SRC, rel), 'utf8'));
      expect(code, rel).toMatch(/\bfixed\b/);
      expect(code, rel).toMatch(/bottom-/);
    }
  });

  it('the feedback launcher is not a fixed button and the panel renders only when open', () => {
    const code = stripComments(readFileSync(path.join(SRC, 'components/common/feedback-widget.tsx'), 'utf8'));
    expect(code).not.toMatch(/fixed bottom-6 right-6/);
    expect(code).toMatch(/\{open && \(/);
  });

  it('ad slot reserved heights are unchanged', () => {
    const code = readFileSync(path.join(SRC, 'components/common/ad-slot.tsx'), 'utf8');
    expect(code).toContain("const RESERVE = 'min-h-[100px] md:min-h-[280px]';");
  });
});
