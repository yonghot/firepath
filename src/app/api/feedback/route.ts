import { NextResponse } from 'next/server';
import { validateFeedback } from '@/lib/utils/feedback-validation';
import { forwardSubmission } from '@/lib/utils/forward-submission';
import { messageEndpoint, UNDELIVERED_MESSAGE } from '@/lib/feedback-endpoint';

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

  const endpoint = messageEndpoint();
  if (!endpoint) {
    return NextResponse.json({ ok: false, error: UNDELIVERED_MESSAGE }, { status: 503 });
  }
  if (!(await forwardSubmission(endpoint, record))) {
    return NextResponse.json({ ok: false, error: UNDELIVERED_MESSAGE }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
