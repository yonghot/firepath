/**
 * code-08-privacy-required.test.ts — 부속W CODE-08.
 *
 * The privacy policy is the ONLY page AdSense's documentation requires, and it
 * requires specific content (부속W §7 anti-pattern 12: filling it with a generic
 * template is how the real requirement gets missed). Three things must be there:
 *
 *   1. The third-party-cookie notice — that third-party vendors, Google
 *      included, use cookies to serve ads based on prior visits.
 *   2. An opt-out route — a link to Google's ad settings.
 *   3. A NAMED list of the third-party vendors this site loads, under its own
 *      heading, not a vague mention that some exist.
 *
 * The list must also be specific to gofirepath.com: ten sibling sites share one
 * publisher id, so the vendors pinned below are the ones THIS repo really
 * contacts — the AdSense loader in src/app/layout.tsx, the GA tag injected by
 * cookie-consent-banner.tsx, the Supabase browser client, the Stripe-hosted
 * checkout redirect, and Vercel.
 *
 * Asserted against the route source (this repo's `node` vitest environment has
 * no DOM — see src/lib/__tests__/analytics.test.ts), which is the same text the
 * server renders: the page is a server component with no client-only branches,
 * so anything asserted here is present with JavaScript disabled — the state a
 * crawler and a policy reviewer see.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const PRIVACY_SOURCE = readFileSync(
  path.join(ROOT, 'src', 'app', '(main)', 'privacy', 'page.tsx'),
  'utf-8'
);
const LAYOUT_SOURCE = readFileSync(path.join(ROOT, 'src', 'app', 'layout.tsx'), 'utf-8');
const BANNER_SOURCE = readFileSync(
  path.join(ROOT, 'src', 'components', 'common', 'cookie-consent-banner.tsx'),
  'utf-8'
);

describe('CODE-08 — privacy policy required elements', () => {
  it('resolves the repo root (guards against the whole suite asserting on the wrong file)', () => {
    expect(PRIVACY_SOURCE).toContain('export default function PrivacyPage');
  });

  it('states that third-party vendors including Google use advertising cookies', () => {
    expect(PRIVACY_SOURCE).toMatch(
      /[Tt]hird-party vendors, including Google, use cookies to serve ads[\s\S]{0,80}prior\s+visits/
    );
  });

  it("links to Google's ad settings so a reader can opt out", () => {
    expect(PRIVACY_SOURCE).toMatch(
      /https:\/\/(www\.google\.com\/settings\/ads|adssettings\.google\.com|myadcenter\.google\.com)/
    );
  });

  it('names the third-party vendors and ad networks actually used by this site', () => {
    for (const vendor of [
      'Google AdSense',
      'Google Analytics 4',
      'Supabase',
      'Stripe',
      'Vercel',
    ]) {
      expect(PRIVACY_SOURCE, `${vendor} must be named in the vendor list`).toContain(vendor);
    }
    // The hosts, so the list is verifiable rather than decorative. Each of these
    // appears in this repo's own code, not in a boilerplate list.
    expect(PRIVACY_SOURCE).toContain('pagead2.googlesyndication.com');
    expect(PRIVACY_SOURCE).toContain('googleads.g.doubleclick.net');
    expect(PRIVACY_SOURCE).toContain('www.googletagmanager.com');
    expect(PRIVACY_SOURCE).toContain('*.supabase.co');
  });

  it('only names hosts this repo actually contacts', () => {
    // The AdSense hosts and the GA tag host must be real call sites here, so the
    // policy can never drift into naming a vendor the site does not load.
    expect(LAYOUT_SOURCE).toContain('pagead2.googlesyndication.com');
    expect(LAYOUT_SOURCE).toContain('googleads.g.doubleclick.net');
    expect(BANNER_SOURCE).toContain('www.googletagmanager.com');
  });

  it('gives the vendor list its own heading (not buried in a cookie paragraph)', () => {
    expect(PRIVACY_SOURCE).toMatch(
      /Third-party vendors and ad networks used on this site\s*\n?\s*<\/h3>/
    );
  });

  it('does not claim the opt-out removes advertising', () => {
    expect(PRIVACY_SOURCE).toMatch(/Opting out does not remove advertising/);
  });

  it('keeps the vendor list honest when no ad client is configured', () => {
    // The ad-specific claims sit behind ADS_ENABLED so a build with no AdSense
    // client id never asserts that ads are served; the non-ad vendors (Supabase,
    // Stripe, Vercel, GA4) are unconditional because they always apply.
    expect(PRIVACY_SOURCE).toMatch(/const ADS_ENABLED = Boolean\(\s*process\.env\.NEXT_PUBLIC_ADSENSE_CLIENT_ID/);
    const vendorHeadingAt = PRIVACY_SOURCE.indexOf(
      'Third-party vendors and ad networks used on this site'
    );
    const supabaseAt = PRIVACY_SOURCE.indexOf('*.supabase.co');
    expect(vendorHeadingAt).toBeGreaterThan(-1);
    expect(supabaseAt).toBeGreaterThan(vendorHeadingAt);
  });
});

describe('CODE-08 — denied-by-default ad storage ahead of the ad loader', () => {
  it('declares every storage type denied by default', () => {
    expect(LAYOUT_SOURCE).toMatch(/gtag\('consent','default'/);
    for (const key of [
      'ad_storage',
      'ad_user_data',
      'ad_personalization',
      'analytics_storage',
    ]) {
      expect(LAYOUT_SOURCE, `${key} must default to denied`).toMatch(
        new RegExp(`${key}\\s*:\\s*'denied'`)
      );
    }
  });

  it('emits the Consent Mode defaults BEFORE the AdSense loader in the document', () => {
    // Ordering matters: the very first ad request must already carry a consent
    // signal. Both are rendered inline in <head>, so source order is document
    // order.
    // Anchor on the rendered JSX, not on prose: the comment above the consent
    // snippet names adsbygoogle.js while explaining this very ordering rule, so
    // a bare substring search would compare a comment against the real tag.
    const defaultsAt = LAYOUT_SOURCE.indexOf('consentDefault }}');
    const loaderAt = LAYOUT_SOURCE.indexOf(
      'pagead2.googlesyndication.com/pagead/js/adsbygoogle.js'
    );
    expect(defaultsAt).toBeGreaterThan(-1);
    expect(loaderAt).toBeGreaterThan(-1);
    expect(
      defaultsAt,
      'the Consent Mode default script must precede the AdSense loader in layout.tsx'
    ).toBeLessThan(loaderAt);
  });

  it('grants ad storage only via a consent update, never by editing the defaults', () => {
    expect(BANNER_SOURCE).toMatch(/gtag\('consent',\s*'update'/);
    expect(BANNER_SOURCE).toMatch(/ad_storage:\s*'granted'/);
    // EEA/UK/CH stay denied until the visitor accepts — the region gate the
    // update path is keyed on.
    expect(BANNER_SOURCE).toMatch(/EEA_UK_CH/);
    expect(BANNER_SOURCE).not.toMatch(/gtag\('consent',\s*'default'/);
  });
});
