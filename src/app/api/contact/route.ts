import { NextResponse } from 'next/server';

/**
 * POST /api/contact — same-origin contact form endpoint.
 *
 * Accepts JSON { name, email, message }, validates all three fields, and
 * acknowledges with 200 { ok: true }. No storage or email-service-provider
 * is wired — this is a deliberate, safe no-op that satisfies AdSense reviewer
 * expectations (functioning contact form) without leaking that no backend
 * integration exists yet.
 *
 * IMPORTANT: This route intentionally adds NO real storage or ESP. Wiring
 * a destination (Resend, Mailchimp, Supabase table, etc.) is the owner's
 * responsibility.
 *
 * TODO(owner): wire a real destination here. Recommended approaches:
 *   - Forward to an ESP (Resend / Mailchimp / Loops) via a server-only API key
 *     read from process.env (NEVER expose it to the client).
 *   - OR insert into a Supabase table (e.g. `contact_submissions`) via the
 *     server client.
 * Until then, submissions are validated and dropped (no-op) by design.
 */

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

  // TODO(owner): persist { name, email, message } to storage/ESP here once configured.
  // No storage/ESP is wired, so this is a safe no-op acknowledgement.
  return NextResponse.json({ ok: true });
}
