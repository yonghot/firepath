import { NextResponse } from 'next/server';
import { validateFeedback } from '@/lib/utils/feedback-validation';
import { forwardSubmission } from '@/lib/utils/forward-submission';

/**
 * POST /api/feedback — site-wide user feedback endpoint.
 *
 * Accepts JSON { type, message, email?, pageUrl?, site? }, validates, then:
 *   - If FEEDBACK_ENDPOINT is set → forwards the assembled record to that URL
 *     (Google Sheet Apps Script, Formspree, etc.) via a server-side fetch.
 *     On external-fetch failure we still return 200 { ok: true } so the user
 *     is never blocked; the failure is logged server-side.
 *   - If FEEDBACK_ENDPOINT is unset → safe no-op, returns 200 { ok: true }.
 *
 * NEVER echoes secrets. No DB. No Supabase.
 *
 * TODO(owner): Set FEEDBACK_ENDPOINT in your .env / Vercel env vars to the
 *   Google Sheets Apps Script URL, Formspree endpoint, or any webhook that
 *   accepts a POST with Content-Type: application/json.
 */

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Cap raw request body to ~10 KB to prevent abuse. */
const MAX_BODY_BYTES = 10 * 1024;

export async function POST(request: Request) {
  // Guard against oversized bodies.
  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) {
    return NextResponse.json(
      { ok: false, error: 'Request body too large.' },
      { status: 400 }
    );
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (Buffer.byteLength(text, 'utf8') > MAX_BODY_BYTES) {
      return NextResponse.json(
        { ok: false, error: 'Request body too large.' },
        { status: 400 }
      );
    }
    body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid JSON body.' },
      { status: 400 }
    );
  }

  const result = validateFeedback(body);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  const { payload } = result;

  // Augment with server-side metadata.
  const record = {
    ...payload,
    userAgent: request.headers.get('user-agent') ?? '',
    receivedAt: new Date().toISOString(),
  };

  // Forward to external collector if configured.
  const endpoint = process.env.FEEDBACK_ENDPOINT;
  if (endpoint) await forwardSubmission(endpoint, record);

  return NextResponse.json({ ok: true });
}
