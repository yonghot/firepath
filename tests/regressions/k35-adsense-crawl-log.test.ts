import { afterEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { middleware } from '../../middleware';

const GOOGLEBOT = 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)';
const MEDIAPARTNERS = 'Mediapartners-Google';
const ADSBOT = 'Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X) AppleWebKit/537.36 (compatible; AdsBot-Google-Mobile; +http://www.google.com/mobile/adsbot.html)';

const req = (ua: string | null, path = '/guide?q=secret') =>
  new NextRequest(`https://gofirepath.com${path}`, { headers: ua ? { 'user-agent': ua, cookie: 'a=b' } : {} });

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('K35 AdSense crawl log', () => {
  it('logs one line with path, deployment id and crawler kind, without query or cookies', async () => {
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', 'dpl_test');
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await middleware(req(MEDIAPARTNERS));
    await middleware(req(ADSBOT, '/about'));
    expect(log.mock.calls.map((c) => c[0])).toEqual([
      'adsense-crawl {"p":"/guide","d":"dpl_test","ua":"mp"}',
      'adsense-crawl {"p":"/about","d":"dpl_test","ua":"adsbot"}',
    ]);
  });

  it('logs nothing for other user agents and for a missing one, and the response is unchanged', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const plain = await middleware(req(GOOGLEBOT));
    const crawler = await middleware(req(MEDIAPARTNERS));
    await middleware(req(null));
    expect(log.mock.calls.filter((c) => String(c[0]).startsWith('adsense-crawl'))).toHaveLength(1);
    expect(crawler.status).toBe(plain.status);
    expect(crawler.cookies.get('visitor_country')?.value).toBe(plain.cookies.get('visitor_country')?.value);
  });

  it('writes null when the deployment id is absent', async () => {
    vi.stubEnv('VERCEL_DEPLOYMENT_ID', undefined);
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    await middleware(req(MEDIAPARTNERS, '/'));
    expect(log).toHaveBeenCalledWith('adsense-crawl {"p":"/","d":null,"ua":"mp"}');
  });
});
