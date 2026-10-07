import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { renderToStaticMarkup } from 'react-dom/server';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const WRAPPER = 'class="min-h-[100px] md:min-h-[280px]"';

async function render(props: { isPremium?: boolean; displayAd?: boolean } = {}): Promise<string> {
  vi.resetModules();
  const { ResultMonetization } = await import('@/components/monetization/ResultMonetization');
  return renderToStaticMarkup(createElement(ResultMonetization, props));
}

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_ID', '');
  vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_RESULT', '');
  vi.stubEnv('NEXT_PUBLIC_AD_PROVIDER', '');
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('W7: the result stack never renders an empty reserved-height block', () => {
  it('no slot id configured: no 100/280px wrapper in the markup', async () => {
    expect(await render()).not.toContain('min-h-[100px]');
  });

  it('a non-numeric slot id is not a slot: still no wrapper', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_ID', 'not-a-slot');
    expect(await render()).not.toContain('min-h-[100px]');
  });

  it('positive control: a numeric slot id renders the wrapper', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_ID', '1234567890');
    expect(await render()).toContain(WRAPPER);
  });

  it('premium visitors get no wrapper even with a slot id', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_ID', '1234567890');
    expect(await render({ isPremium: true })).not.toContain('min-h-[100px]');
  });

  it('a route without the ad loader opts out of the display unit (displayAd=false) even with a slot id', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_ID', '1234567890');
    expect(await render({ displayAd: false })).not.toContain('min-h-[100px]');
  });

  it('/result, which has no loader, passes displayAd={false}', () => {
    const source = readFileSync(join(__dirname, '..', '..', 'src', 'app', '(utility)', 'result', 'page.tsx'), 'utf8');
    expect(source).toMatch(/<ResultMonetization[^>]*displayAd=\{false\}/);
  });

  it('provider "none" renders no wrapper even with a slot id', async () => {
    vi.stubEnv('NEXT_PUBLIC_ADSENSE_SLOT_ID', '1234567890');
    vi.stubEnv('NEXT_PUBLIC_AD_PROVIDER', 'none');
    expect(await render()).not.toContain('min-h-[100px]');
  });
});
