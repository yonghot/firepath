import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as termsModule from '@/app/(main)/terms/page';
import * as privacyModule from '@/app/(main)/privacy/page';
import { preloadPages, renderPage } from './helpers/render-pages';

await preloadPages();

const SRC = join(__dirname, '..', '..', 'src');
const PAGES = ['/terms', '/privacy', '/about', '/', '/methodology'];
const FALSE_WHEN_NOTHING_IS_OFFERED = [
  /Premium subscribers/i,
  /auto-?renew/i,
  /\$4\.99/,
  /Create a free account/i,
  /Monte Carlo/i,
  /Stripe/,
  /Supabase/,
  /create an account/i,
  /saved calculations/i,
  /\bpremium\b/i,
];

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;| /g, ' ')
    .replace(/\s+/g, ' ');

function offer(options: { accounts: boolean; premium: boolean; ads: boolean }) {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', options.accounts ? 'https://example.supabase.test' : '');
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', options.accounts ? 'test-anon-key' : '');
  vi.stubEnv('STRIPE_SECRET_KEY', options.premium ? 'test-stripe-key' : '');
  vi.stubEnv('STRIPE_PREMIUM_PRICE_ID', options.premium ? 'test-price-id' : '');
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_CLIENT_ID', options.ads ? 'ca-pub-0000000000000000' : '');
}

async function metadataOf(page: unknown): Promise<{ description: string }> {
  const { generateMetadata } = page as { generateMetadata: () => Promise<{ description: string }> };
  return generateMetadata();
}

afterEach(() => vi.unstubAllEnvs());

describe('K5: no statement about a product that cannot be bought or an account that cannot be created', () => {
  for (const ads of [true, false]) {
    for (const path of PAGES) {
      it(`${path} (ads ${ads ? 'on' : 'off'}): premium, billing, account and Monte Carlo claims are absent`, async () => {
        offer({ accounts: false, premium: false, ads });
        const visible = text(await renderPage(path));
        for (const pattern of FALSE_WHEN_NOTHING_IS_OFFERED) expect(visible, String(pattern)).not.toMatch(pattern);
      });
    }
  }

  it('Terms and Privacy meta descriptions do not mention premium or accounts', async () => {
    offer({ accounts: false, premium: false, ads: true });
    for (const page of [termsModule, privacyModule]) {
      const { description } = await metadataOf(page);
      expect(description).not.toMatch(/premium|account|saved calculations/i);
    }
  });

  it('the cookie banner and the home FAQ source do not mention premium, accounts or Monte Carlo', () => {
    for (const file of [join('components', 'common', 'cookie-consent-banner.tsx'), join('components', 'common', 'faq-section.tsx')]) {
      const source = readFileSync(join(SRC, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      for (const pattern of [/Premium/, /free account/i, /Monte Carlo/i]) expect(source, `${file} ${pattern}`).not.toMatch(pattern);
    }
  });
});

describe('K5: the same statements render when the feature really exists', () => {
  it('Terms and Privacy describe accounts, billing and the payment processor when both are configured', async () => {
    offer({ accounts: true, premium: true, ads: true });
    const terms = text(await renderPage('/terms'));
    expect(terms).toContain('Accounts and Registration');
    expect(terms).toContain('Premium Subscription and Billing');
    expect(terms).toContain('Stripe');
    const privacy = text(await renderPage('/privacy'));
    expect(privacy).toContain('Account Information');
    expect(privacy).toContain('Payment and Subscription Information');
    expect(privacy).toContain('Stripe');
    expect(privacy).toContain('Supabase');
    expect((await metadataOf(termsModule)).description).toMatch(/premium/i);
    expect((await metadataOf(privacyModule)).description).toMatch(/account/i);
  });

  it('Methodology keeps the Monte Carlo sources only when the simulation is offered', async () => {
    offer({ accounts: true, premium: true, ads: false });
    expect(text(await renderPage('/methodology'))).toContain('Monte Carlo');
  });

  it('accounts without billing: Terms and Privacy describe accounts but not Stripe or premium', async () => {
    offer({ accounts: true, premium: false, ads: false });
    for (const path of ['/terms', '/privacy']) {
      const visible = text(await renderPage(path));
      expect(visible, path).toMatch(/Account/);
      expect(visible, path).not.toMatch(/Stripe|premium|auto-?renew/i);
    }
  });
});

describe('numbering stays consecutive however many sections render', () => {
  const states = [
    { accounts: false, premium: false },
    { accounts: true, premium: false },
    { accounts: true, premium: true },
  ];

  for (const state of states) {
    it(`Terms h2 numbers are 1..N (accounts ${state.accounts}, premium ${state.premium})`, async () => {
      offer({ ...state, ads: true });
      const numbers = [...(await renderPage('/terms')).matchAll(/<h2[^>]*>\s*(\d+)\.\s/g)].map((m) => Number(m[1]));
      expect(numbers).toEqual(numbers.map((_, index) => index + 1));
      expect(numbers.length).toBeGreaterThanOrEqual(10);
    });

    it(`Privacy section 2 letters run a, b, c... (accounts ${state.accounts}, premium ${state.premium})`, async () => {
      offer({ ...state, ads: true });
      const letters = [...(await renderPage('/privacy')).matchAll(/<h3[^>]*>\s*2([a-z])\.\s/g)].map((m) => m[1]);
      expect(letters.length).toBeGreaterThanOrEqual(3);
      expect(letters).toEqual(letters.map((_, index) => String.fromCharCode(97 + index)));
    });
  }
});

describe('FIRE-29: the open data and the embed are permitted by the Terms', () => {
  it('Terms carve the open dataset and the embed out of the scraping and copying prohibitions', async () => {
    offer({ accounts: false, premium: false, ads: true });
    const terms = text(await renderPage('/terms'));
    expect(terms).toContain('/data.json');
    expect(terms).toContain('/data.csv');
    expect(terms).toContain('CC BY 4.0');
    expect(terms).toMatch(/embed/i);
  });

  it('/fire-statistics states the license the Dataset JSON-LD declares', async () => {
    offer({ accounts: false, premium: false, ads: true });
    const html = await renderPage('/fire-statistics');
    expect(html.replace(/<script[\s\S]*?<\/script>/g, '')).toContain('href="https://creativecommons.org/licenses/by/4.0/"');
    expect(text(html)).toContain('CC BY 4.0');
  });
});
