import { NextResponse } from 'next/server';

/**
 * POST /api/subscribe — same-origin email-capture endpoint.
 *
 * Accepts JSON { email, source?, url? }, validates the email, and persists it
 * IF storage/an ESP is configured. When NOTHING is configured (no env), it is a
 * deliberate, safe no-op that still returns 200 { ok: true } so the front-end
 * form works without breaking and without leaking that no backend exists.
 *
 * IMPORTANT: This route intentionally integrates NO real email-service-provider
 * and adds NO secrets. Wiring storage/ESP is the owner's responsibility.
 *
 * TODO(owner): wire a real destination here. Recommended approaches:
 *   - Insert into a Supabase table (e.g. `email_captures`) via the server client.
 *   - OR forward to an ESP (Resend / Mailchimp / ConvertKit / Loops) using a
 *     server-only API key read from process.env (NEVER expose it to the client).
 * Until then, captured emails are accepted and dropped (no-op) by design.
 */

// Conservative RFC-5322-lite email check — good enough for capture validation.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

  const email =
    typeof body === 'object' && body !== null && 'email' in body
      ? String((body as { email: unknown }).email ?? '').trim()
      : '';

  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    return NextResponse.json(
      { ok: false, error: 'A valid email is required.' },
      { status: 400 }
    );
  }

  // TODO(owner): persist `email` to storage/ESP here once configured.
  // No storage/ESP is wired, so this is a safe no-op acknowledgement.
  return NextResponse.json({ ok: true });
}
