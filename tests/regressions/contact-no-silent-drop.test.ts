import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { POST } from '@/app/api/contact/route';
import { PUBLISHER } from '@/lib/site';
import { renderPage } from './helpers/render-pages';

const ENDPOINT = 'http://127.0.0.1:9/collect';
const VALID = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'The 1.44x figure on the healthcare page looks off.' };

function request(body: unknown = VALID): Request {
  return new Request('http://localhost/api/contact', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'user-agent': 'vitest' },
    body: JSON.stringify(body),
  });
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv('FEEDBACK_DELIVERY_CONFIRMED', '1');
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('K5/K10: the contact form never reports success for a message nobody received', () => {
  it('without a delivery endpoint the API refuses and points at the publisher mailbox', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', '');
    const res = await POST(request());
    const data = await res.json();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain(PUBLISHER.email);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the validated message and reports success only after a 2xx', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    const sent = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(sent).toMatchObject({ type: 'contact', name: VALID.name, email: VALID.email, message: VALID.message });
  });

  it('a non-2xx answer from the endpoint is not reported as sent', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const res = await POST(request());
    const data = await res.json();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain(PUBLISHER.email);
  });

  it('a network failure is not reported as sent and leaks no detail', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    fetchMock.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:9'));
    const res = await POST(request());
    const data = await res.json();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(data.ok).toBe(false);
    expect(JSON.stringify(data)).not.toContain('ECONNREFUSED');
  });

  it('invalid input is still rejected before any forwarding', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    const res = await POST(request({ ...VALID, email: 'nope' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('K6: /contact leads with the publisher mailbox and makes no unfounded promises', () => {
  it('shows the publisher mailbox, the correction instruction and no support-team claims', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    const html = await renderPage('/contact');
    expect(html).toContain(`mailto:${PUBLISHER.email}`);
    expect(html).toContain('To request a correction');
    expect(html).toContain('published by');
    expect(html).toContain('Actigence');
    expect(html).not.toMatch(/Support Team|We read every submission|aim to respond|get back to you/i);
  });

  it('renders the form only when a delivery endpoint is configured', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    expect(await renderPage('/contact')).toContain('Send Message');
    vi.stubEnv('FEEDBACK_ENDPOINT', '');
    const withoutForm = await renderPage('/contact');
    expect(withoutForm).not.toContain('Send Message');
    expect(withoutForm).toContain(`mailto:${PUBLISHER.email}`);
  });

  it('the form promises no reply time and names who received the message', () => {
    const source = readFileSync(join(__dirname, '..', '..', 'src', 'components', 'features', 'contact', 'contact-form.tsx'), 'utf8');
    expect(source).not.toMatch(/get back to you|as soon as we can|was sent\./i);
    expect(source).toContain('was passed to');
  });
});
