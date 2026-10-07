import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { POST as postContact } from '@/app/api/contact/route';
import { POST as postFeedback } from '@/app/api/feedback/route';
import { Footer } from '@/components/layouts/footer';
import { isMessageEndpointConfigured } from '@/lib/feedback-endpoint';
import { PUBLISHER } from '@/lib/site';
import { preloadPages, renderPage } from './helpers/render-pages';

await preloadPages(['/privacy', '/contact']);

const ENDPOINT = 'http://127.0.0.1:9/collect';

const text = (html: string) =>
  html
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&#x27;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

function post(url: string, body: unknown): Request {
  const raw = JSON.stringify(body);
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'content-length': String(Buffer.byteLength(raw, 'utf8')), 'user-agent': 'vitest' },
    body: raw,
  });
}

const CONTACT = { name: 'Ada', email: 'ada@example.com', message: 'The 1.44x figure looks off.' };
const FEEDBACK = { type: 'bug', message: 'The chart does not render.', email: '', pageUrl: '/', site: 'gofirepath.com' };

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Q-F2: messages are collected only where the publisher is known to read the collector', () => {
  it('an endpoint alone is not enough; the delivery must be confirmed too', () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', '');
    expect(isMessageEndpointConfigured()).toBe(false);
    vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', 'yes please');
    expect(isMessageEndpointConfigured()).toBe(false);
    vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', 'false');
    expect(isMessageEndpointConfigured()).toBe(false);
  });

  it('a confirmation without an endpoint is still off', () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', '');
    vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', '1');
    expect(isMessageEndpointConfigured()).toBe(false);
  });

  it('endpoint plus confirmation turns it on', () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    for (const value of ['1', 'true', ' TRUE ']) {
      vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', value);
      expect(isMessageEndpointConfigured(), value).toBe(true);
    }
  });

  describe('endpoint set, delivery not confirmed (the production state until the publisher confirms)', () => {
    beforeEach(() => {
      vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
      vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', '');
    });

    it('/contact is email-first: the publisher mailbox, no form, no "passed to" wording', async () => {
      const html = await renderPage('/contact');
      expect(html).toContain(`mailto:${PUBLISHER.email}`);
      expect(html).not.toContain('Send Message');
      expect(html).not.toContain('Or send a message here');
      expect(html).not.toMatch(/was passed to/);
    });

    it('Privacy makes no claim about a message collection service', async () => {
      const privacy = text(await renderPage('/privacy'));
      expect(privacy).not.toContain('Messages You Send Us');
      expect(privacy).not.toMatch(/collection service configured by/);
    });

    it('the footer offers no feedback launcher', () => {
      expect(renderToStaticMarkup(createElement(Footer))).not.toContain('Send feedback');
    });

    it('both APIs refuse, point at the mailbox and never call the collector', async () => {
      for (const [res, label] of [
        [await postContact(post('http://localhost/api/contact', CONTACT)), 'contact'],
        [await postFeedback(post('http://localhost/api/feedback', FEEDBACK)), 'feedback'],
      ] as const) {
        const data = await res.json();
        expect(res.status, label).toBe(503);
        expect(data.ok, label).toBe(false);
        expect(data.error, label).toContain(PUBLISHER.email);
      }
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });

  describe('endpoint set and delivery confirmed', () => {
    beforeEach(() => {
      vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
      vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', '1');
    });

    it('the form, the Privacy paragraph and the launcher are all there', async () => {
      expect(await renderPage('/contact')).toContain('Send Message');
      expect(text(await renderPage('/privacy'))).toContain('Messages You Send Us');
      expect(renderToStaticMarkup(createElement(Footer))).toContain('Send feedback');
    });

    it('both APIs forward and answer 200 after a 2xx', async () => {
      expect((await postContact(post('http://localhost/api/contact', CONTACT))).status).toBe(200);
      expect((await postFeedback(post('http://localhost/api/feedback', FEEDBACK))).status).toBe(200);
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });
  });
});
