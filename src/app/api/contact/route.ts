import { NextResponse } from 'next/server';
import { PUBLISHER, SITE_URL } from '@/lib/site';
import { forwardSubmission } from '@/lib/utils/forward-submission';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const UNDELIVERED = `Your message could not be delivered. Please email ${PUBLISHER.email} instead.`;

// Conservative RFC-5322-lite email check — good enough for capture validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Maximum byte-lengths for each field. */
const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_MESSAGE = 2000;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json(
      { ok: false, error: 'Request body must be a JSON object.' },
      { status: 400 }
    );
  }

  const raw = body as Record<string, unknown>;

  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  const email = typeof raw.email === 'string' ? raw.email.trim() : '';
  const message = typeof raw.message === 'string' ? raw.message.trim() : '';

  if (!name || name.length > MAX_NAME) {
    return NextResponse.json(
      { ok: false, error: `Name is required and must be ${MAX_NAME} characters or fewer.` },
      { status: 400 }
    );
  }

  if (!email || email.length > MAX_EMAIL || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'A valid email address is required.' },
      { status: 400 }
    );
  }

  if (!message || message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { ok: false, error: `Message is required and must be ${MAX_MESSAGE} characters or fewer.` },
      { status: 400 }
    );
  }

  const endpoint = process.env.FEEDBACK_ENDPOINT?.trim();
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: UNDELIVERED }, { status: 503 });
  }

  const delivered = await forwardSubmission(endpoint, {
    type: 'contact',
    name,
    email,
    message,
    pageUrl: '/contact',
    site: new URL(SITE_URL).hostname,
    userAgent: request.headers.get('user-agent') ?? '',
    receivedAt: new Date().toISOString(),
  });
  if (!delivered) {
    return NextResponse.json({ ok: false, error: UNDELIVERED }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
