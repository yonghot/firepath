import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { POST } from '@/app/api/feedback/route';
import { Footer } from '@/components/layouts/footer';
import { PUBLISHER } from '@/lib/site';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const ENDPOINT = 'http://127.0.0.1:9/collect';
const VALID = { type: 'bug', message: 'The chart does not render on mobile Safari.', email: 'user@example.com', pageUrl: '/', site: 'gofirepath.com' };

function request(body: unknown = VALID): Request {
  const raw = JSON.stringify(body);
  return new Request('http://localhost/api/feedback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'content-length': String(Buffer.byteLength(raw, 'utf8')), 'user-agent': 'vitest' },
    body: raw,
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

describe('FIRE-03 follow-up: the feedback API never reports success for a message nobody received', () => {
  it('without a delivery endpoint the API refuses and points at the publisher mailbox', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', '');
    const res = await POST(request());
    const data = await res.json();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain(PUBLISHER.email);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('forwards the validated record and reports success only after a 2xx', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    fetchMock.mockResolvedValue(new Response('ok', { status: 200 }));
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(ENDPOINT);
    expect(JSON.parse(init.body as string)).toMatchObject({ type: 'bug', message: VALID.message });
  });

  it('a non-2xx answer from the endpoint is not reported as received', async () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }));
    const res = await POST(request());
    const data = await res.json();
    expect(res.status).toBeGreaterThanOrEqual(500);
    expect(data.ok).toBe(false);
    expect(data.error).toContain(PUBLISHER.email);
  });

  it('a network failure is not reported as received and leaks no detail', async () => {
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
    const res = await POST(request({ ...VALID, type: 'spam' }));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('FIRE-03 follow-up: the footer offers feedback only where a message can be delivered', () => {
  it('no launcher without a delivery endpoint', () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', '');
    expect(renderToStaticMarkup(createElement(Footer))).not.toContain('Send feedback');
  });

  it('the launcher is there when an endpoint is configured', () => {
    vi.stubEnv('FEEDBACK_ENDPOINT', ENDPOINT);
    expect(renderToStaticMarkup(createElement(Footer))).toContain('Send feedback');
  });
});
