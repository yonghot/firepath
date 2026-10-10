import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..');
const APP_DIR = process.env.BUILT_HTML_DIR ?? join(ROOT, '.next', 'server', 'app');
const REQUIRE_BUILD = process.env.REQUIRE_BUILT_HTML === '1';

const CONTENT = [
  ['/', 'index.html'],
  ['/about', 'about.html'],
  ['/fire-guide', 'fire-guide.html'],
  ['/fire-statistics', 'fire-statistics.html'],
  ['/fire-types', 'fire-types.html'],
  ['/guide', 'guide.html'],
  ['/healthcare-bridge', 'healthcare-bridge.html'],
  ['/methodology', 'methodology.html'],
  ['/privacy', 'privacy.html'],
  ['/terms', 'terms.html'],
] as const;
const UTILITY = [
  ['/contact', 'contact.html'],
  ['/login', 'login.html'],
  ['/signup', 'signup.html'],
  ['/premium', 'premium.html'],
  ['/saved', 'saved.html'],
  ['/result', 'result.html'],
  ['/embed', 'embed.html'],
  ['/embed-this', 'embed-this.html'],
  ['/404', '_not-found.html'],
] as const;
const MUST_EXIST = new Set(['/', '/about', '/contact', '/login']);

const LOADER_TAG = /<script\b[^>]*\bsrc="[^"]*adsbygoogle\.js[^"]*"[^>]*>/gi;
const CONSENT_DEFAULT = "gtag('consent','default'";

function scanLoader(html: string) {
  const headEnd = html.indexOf('</head>');
  const head = headEnd < 0 ? '' : html.slice(0, headEnd);
  const body = headEnd < 0 ? html : html.slice(headEnd);
  return {
    headEnd,
    headTags: head.match(LOADER_TAG) ?? [],
    bodyTags: body.match(LOADER_TAG) ?? [],
    consentDefaultsInHead: head.split(CONSENT_DEFAULT).length - 1,
  };
}

const LOADER = '<script id="adsense-loader" async="" crossorigin="anonymous" src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1378312299412437"></script>';
const DEFAULT = "<script>window.dataLayer=[];function gtag(){};gtag('consent','default',{});</script>";
const FLIGHT = '<script>self.__next_f.push([1,"{\\"src\\":\\"https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1\\"}"])</script>';

describe('the built-HTML loader scanner (positive controls on fixture markup)', () => {
  it('accepts a loader inside <head> exactly once and ignores the copy inside the Flight payload', () => {
    const scan = scanLoader(`<html><head>${LOADER}${DEFAULT}</head><body>${FLIGHT}</body></html>`);
    expect(scan.headTags).toHaveLength(1);
    expect(scan.bodyTags).toHaveLength(0);
    expect(scan.consentDefaultsInHead).toBe(1);
  });

  it('flags the pre-change shape, a loader after </head>', () => {
    const scan = scanLoader(`<html><head>${DEFAULT}</head><body><div>${LOADER}</div></body></html>`);
    expect(scan.headTags).toHaveLength(0);
    expect(scan.bodyTags).toHaveLength(1);
  });

  it('flags a duplicated loader and a missing one', () => {
    expect(scanLoader(`<html><head>${LOADER}${LOADER}</head><body></body></html>`).headTags).toHaveLength(2);
    expect(scanLoader('<html><head></head><body></body></html>').headTags).toHaveLength(0);
  });
});

function unusable(): string | undefined {
  const index = join(APP_DIR, 'index.html');
  if (!existsSync(index)) return `no built HTML at ${APP_DIR}; run next build first`;
  if (!/name="google-adsense-account"/.test(readFileSync(index, 'utf8'))) {
    return `the build at ${APP_DIR} has no AdSense publisher meta, so it was built without ads enabled; rebuild with NEXT_PUBLIC_ADSENSE_CLIENT_ID=ca-pub-1378312299412437`;
  }
  return undefined;
}

describe('built HTML: the AdSense loader sits in <head> on content routes only', () => {
  const problem = unusable();

  it('has a usable build to inspect', (ctx) => {
    if (!problem) return;
    if (REQUIRE_BUILD) throw new Error(`REQUIRE_BUILT_HTML=1 but ${problem}`);
    console.warn(`[built-html-ad-loader] SKIPPED: ${problem}`);
    ctx.skip(problem);
  });

  for (const [route, file] of CONTENT) {
    it(`${route}: exactly one loader script in <head>, none after it, after the inline consent default`, (ctx) => {
      if (problem) return ctx.skip(problem);
      const path = join(APP_DIR, file);
      if (!existsSync(path)) {
        expect(MUST_EXIST.has(route), `${file} is missing from the build`).toBe(false);
        return ctx.skip(`${file} not prerendered`);
      }
      const scan = scanLoader(readFileSync(path, 'utf8'));
      expect(scan.headEnd, 'a closing </head>').toBeGreaterThan(-1);
      expect(scan.headTags, 'loader scripts inside <head>').toHaveLength(1);
      expect(scan.bodyTags, 'loader scripts after </head>').toHaveLength(0);
      expect(scan.consentDefaultsInHead, 'inline consent defaults inside <head>').toBe(1);
      expect(scan.headTags[0]).toMatch(/\bid="adsense-loader"/);
      expect(scan.headTags[0]).toMatch(/\basync=""/);
      expect(scan.headTags[0]).toMatch(/\bcrossorigin="anonymous"/);
      expect(scan.headTags[0]).toMatch(/adsbygoogle\.js\?client=ca-pub-\d+"/);
      expect(scan.headTags[0]).not.toMatch(/\bnonce=/);
    });
  }

  for (const [route, file] of UTILITY) {
    it(`${route}: no loader anywhere`, (ctx) => {
      if (problem) return ctx.skip(problem);
      const path = join(APP_DIR, file);
      if (!existsSync(path)) {
        expect(MUST_EXIST.has(route), `${file} is missing from the build`).toBe(false);
        return ctx.skip(`${file} not prerendered`);
      }
      const html = readFileSync(path, 'utf8');
      const scan = scanLoader(html);
      expect(scan.headTags).toHaveLength(0);
      expect(scan.bodyTags).toHaveLength(0);
      expect(html).not.toContain('id="adsense-loader"');
    });
  }
});
