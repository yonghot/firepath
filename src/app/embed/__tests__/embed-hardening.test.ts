/**
 * embed-hardening.test.ts — 부속P CODE-03 acceptance-criteria regression guard.
 *
 * "Copying the embed snippet ... yields an <iframe src=.../embed/...> plus
 * an attribution anchor with rel containing both 'nofollow' and 'ugc'.
 * Embed pages return noindex. Loading an embed ... auto-resizes and fires a
 * GA4 event carrying the host referrer. No followed link is emitted from
 * any embed."
 *
 * Source-level checks (no jsdom in this repo's vitest environment — see
 * ad-slot.test.ts for the same documented constraint).
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '../../../..');

function readSource(relPath: string): string {
  return readFileSync(path.join(ROOT, relPath), 'utf8');
}

describe('부속P CODE-03 — embed attribution link is rel="nofollow ugc"', () => {
  it('EmbedAttribution (rendered inside the iframe) carries nofollow + ugc, never sponsored', () => {
    const source = readSource('src/app/embed/embed-attribution.tsx');
    expect(source).toMatch(/rel="nofollow ugc/);
    expect(source).not.toContain('nofollow sponsored');
  });

  it('EmbedSnippet (the copy-paste panel markup) carries nofollow + ugc, never sponsored', () => {
    const source = readSource('src/components/common/embed-snippet.tsx');
    expect(source).toMatch(/rel="nofollow ugc/);
    expect(source).not.toContain('nofollow sponsored');
  });

  it('the copy-paste snippet contains an iframe pointing at /embed', () => {
    const source = readSource('src/components/common/embed-snippet.tsx');
    expect(source).toMatch(/<iframe[\s\S]*?src="\$\{SITE_URL\}\/embed"/);
  });
});

describe('부속P CODE-03 — embed pages stay noindex', () => {
  it('/embed route metadata sets robots index:false', () => {
    const source = readSource('src/app/embed/page.tsx');
    expect(source).toMatch(/robots:\s*{\s*index:\s*false/);
  });
});

describe('부속P CODE-03 — postMessage height-resize', () => {
  it('EmbedResizeScript posts a firepath:resize message to the parent window', () => {
    const source = readSource('src/app/embed/embed-resize-script.tsx');
    expect(source).toContain('firepath:resize');
    expect(source).toContain('window.parent.postMessage');
  });

  it('EmbedSnippet listens for the firepath:resize message and resizes the iframe', () => {
    const source = readSource('src/components/common/embed-snippet.tsx');
    expect(source).toContain('firepath:resize');
    expect(source).toContain("addEventListener('message'");
  });
});

describe('부속P CODE-03 — embed_loaded GA4 event carries the referring host', () => {
  it('EmbedAttribution fires embed_loaded with a host_domain param', () => {
    const source = readSource('src/app/embed/embed-attribution.tsx');
    expect(source).toMatch(/trackEvent\('embed_loaded',\s*{\s*host_domain/);
  });
});

describe('부속P CODE-03 — "Embed this calculator" panel on main calculator pages', () => {
  it('the home page ("/") renders the EmbedSnippet copy-to-clipboard panel', () => {
    const source = readSource('src/app/(main)/page.tsx');
    expect(source).toContain("from '@/components/common/embed-snippet'");
    expect(source).toMatch(/<EmbedSnippet\s*\/>/);
  });
});

describe('부속P CODE-03 — no followed link is emitted from any embed source file', () => {
  it('no rel attribute in the embed route/components omits nofollow while linking off-iframe', () => {
    const files = [
      'src/app/embed/embed-attribution.tsx',
      'src/components/common/embed-snippet.tsx',
    ];
    for (const file of files) {
      const source = readSource(file);
      // Every rel="..." attribute value found must include nofollow.
      const relMatches = [...source.matchAll(/rel="([^"]*)"/g)];
      expect(relMatches.length).toBeGreaterThan(0);
      for (const match of relMatches) {
        expect(match[1]).toContain('nofollow');
      }
    }
  });
});
