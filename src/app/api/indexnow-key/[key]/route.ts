interface RouteParams {
  params: Promise<{ key: string }>;
}

// Reached through the next.config.ts rewrite from /<key>.txt; a root [param] route here would turn every single-segment 404 into this handler's plain-text reply.
export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const key = process.env.INDEXNOW_KEY?.trim();
  const { key: requested } = await params;
  if (!key || requested !== key) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' },
  });
}
