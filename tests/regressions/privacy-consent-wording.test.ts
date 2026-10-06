import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { preloadPages, renderPage } from './helpers/render-pages';

await preloadPages(['/privacy', '/contact']);

const ROOT = join(__dirname, '..', '..');

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;| /g, ' ')
    .replace(/\s+/g, ' ');

function configure(options: { ads: boolean; endpoint: boolean }) {
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', options.ads ? 'ca-pub-1234567890' : '');
  vi.stubEnv('VERCEL_ENV', undefined);
  vi.stubEnv('NEXT_PUBLIC_VERCEL_ENV', undefined);
  vi.stubEnv('FEEDBACK_ENDPOINT', options.endpoint ? 'https://collector.example.test/hook' : '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');
  vi.stubEnv('STRIPE_SECRET_KEY', '');
  vi.stubEnv('STRIPE_PREMIUM_PRICE_ID', '');
}

afterEach(() => vi.unstubAllEnvs());

describe('K5/K16: the privacy page describes the consent, collection and cookie behaviour that ships', () => {
  it('names Google\'s certified consent message as the EEA/UK/CH consent UI', async () => {
    configure({ ads: true, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).toMatch(/EEA, UK, and Switzerland[^.]{0,200}certified consent message/);
    expect(privacy).toContain('Funding Choices');
  });

  it('describes the notice opened from the footer link, what Decline does, and where the choice is stored', async () => {
    configure({ ads: true, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).toMatch(/link in the site footer/);
    expect(privacy).toMatch(/Decline tells Google to deny/);
    expect(privacy).toContain('firepath_cookie_consent');
    expect(privacy).not.toMatch(/consent banner/i);
    expect(privacy).not.toMatch(/via the cookie banner/i);
  });

  it('the banner "Learn more" anchor resolves to a heading id on the page', async () => {
    configure({ ads: true, endpoint: true });
    const banner = readFileSync(join(ROOT, 'src', 'components', 'common', 'cookie-consent-banner.tsx'), 'utf8');
    const anchor = banner.match(/href="\/privacy#([a-z0-9-]+)"/)?.[1];
    expect(anchor).toBe('4-cookies-and-tracking-technologies');
    const html = await renderPage('/privacy');
    expect(html).toMatch(new RegExp(`<h2[^>]*id="${anchor}"[^>]*>\\s*4\\. Cookies and Tracking Technologies`));
  });

  it('discloses the contact form and Feedback collection and who receives it, when a collector is configured', async () => {
    configure({ ads: true, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).toContain('Messages You Send Us');
    expect(privacy).toMatch(/contact form[^.]*name[^.]*email address[^.]*message/i);
    expect(privacy).toMatch(/Feedback button[^.]*optional email address[^.]*page address[^.]*user agent/i);
    expect(privacy).toMatch(/collection service configured by Actigence/);
  });

  it('collection of messages is described only where the contact page actually offers the form', async () => {
    configure({ ads: true, endpoint: false });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).not.toContain('Messages You Send Us');
    expect(privacy).not.toMatch(/collection service configured by/);
    const contact = text(await renderPage('/contact'));
    expect(contact).not.toContain('Or send a message here');
  });

  it('analytics claims are accurate: a coarse result band, never the exact inputs', async () => {
    configure({ ads: true, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).toMatch(/coarse size band of the result/);
    expect(privacy).not.toMatch(/no analytics event includes/i);
  });

  it('describes ad placement as Google ads, including automatically placed ads, on content pages', async () => {
    configure({ ads: true, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).toMatch(/automatically placed ads/);
    expect(privacy).not.toMatch(/below the calculator results/);
  });

  it('makes no numeric Google Analytics retention claim', async () => {
    configure({ ads: true, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).not.toMatch(/14[- ]months?/i);
    expect(privacy).not.toMatch(/retention settings, which we configure/);
  });

  it('keeps the interest-based ads text and the opt-out links (K16)', async () => {
    configure({ ads: true, endpoint: true });
    const html = await renderPage('/privacy');
    const privacy = text(html);
    expect(privacy).toMatch(/Third-party vendors, including Google, use cookies to serve ads based on your prior visits/);
    expect(privacy).toContain('Opting out does not remove advertising');
    expect(html).toContain('https://adssettings.google.com');
    expect(html).toContain('https://www.aboutads.info/choices');
  });

  it('has no premium-subscriber claim', async () => {
    configure({ ads: true, endpoint: true });
    expect(text(await renderPage('/privacy'))).not.toMatch(/Premium subscribers/i);
  });

  it('without an ad client it makes no certified-consent-message claim but still says analytics stays denied in the EEA/UK/CH', async () => {
    configure({ ads: false, endpoint: true });
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).not.toContain('certified consent message');
    expect(privacy).toMatch(/analytics storage stays denied/);
    expect(privacy).not.toContain('Google AdSense');
  });
});
