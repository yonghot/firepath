import '@/lib/zod-config';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getClientIp, checkRateLimit } from '@/lib/utils/rate-limit';

/**
 * POST /api/email-results — env-gated "Email my results" capture (부속I T17).
 *
 * Distinct from the existing /api/subscribe (general newsletter capture used
 * by EmailResultCapture / ResultMonetization). This route is TRANSACTIONAL
 * ONLY: the forwarded email contains just the result permalink, zero promo
 * copy — keeping it inside the CAN-SPAM/CASL transactional-message exemption.
 * A separate marketing opt-in (`marketingOptIn`, unchecked by default on the
 * client — see email-my-results-form.tsx) is forwarded as a distinct flag so
 * the ESP can tag consent separately from the transactional send.
 *
 * The route itself is a thin, safe no-op when EMAIL_CAPTURE_ENDPOINT is
 * unset: it validates and returns 200 without forwarding anywhere (mirrors
 * the existing /api/subscribe and /api/feedback "dark until configured"
 * pattern). The FORM that calls this route is additionally gated client-side
 * on NEXT_PUBLIC_EMAIL_CAPTURE_ENABLED — see EmailMyResultsForm — so with
 * both env vars unset the form never even renders.
 *
 * TODO(owner): set EMAIL_CAPTURE_ENDPOINT (+ EMAIL_CAPTURE_API_KEY if the ESP
 * requires an auth header) once an ESP (MailerLite/Buttondown free tier) is
 * provisioned — see 부속I §5 O11.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const RATE_LIMIT = { limit: 5, windowMs: 60_000 };

const BodySchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  calc_type: z.string().trim().min(1).max(100),
  share_url: z.string().trim().url().max(2000),
  /** Separate, unchecked-by-default marketing consent — never inferred from the transactional submit itself. */
  marketingOptIn: z.boolean().optional().default(false),
});

export async function POST(request: Request): Promise<Response> {
  const ip = getClientIp(request);
  if (!checkRateLimit(`email-results:${ip}`, RATE_LIMIT)) {
    return NextResponse.json(
      { ok: false, error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body.' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: 'Invalid request.', issues: parsed.error.issues.map((i) => i.message) },
      { status: 400 }
    );
  }

  const { email, calc_type, share_url, marketingOptIn } = parsed.data;

  const endpoint = process.env.EMAIL_CAPTURE_ENDPOINT;
  if (!endpoint) {
    // Dark until the owner provisions an ESP — safe no-op acknowledgement,
    // same pattern as /api/subscribe and /api/feedback.
    return NextResponse.json({ ok: true });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const apiKey = process.env.EMAIL_CAPTURE_API_KEY;
    await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { Authorization: `Bearer ${apiKey}` }),
      },
      body: JSON.stringify({
        email,
        calc_type,
        // Transactional-only payload: the result permalink, nothing else.
        share_url,
        marketingOptIn,
        source: 'firepath-email-results',
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);
  } catch (err) {
    // Never block the user on an ESP-side failure — log server-side only.
    console.error('[email-results] Failed to forward to EMAIL_CAPTURE_ENDPOINT:', err);
  }

  return NextResponse.json({ ok: true });
}
