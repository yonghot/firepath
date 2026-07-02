/**
 * IndexNow key verification file — GET /{key}.txt (부속I T14).
 *
 * Bing/Yandex/Naver's IndexNow protocol requires the submitted key to be
 * retrievable at https://{host}/{key}.txt, containing exactly the key. This
 * catch-all dynamic segment matches ANY single path segment (Next.js routes
 * "/foo.txt" through the `[indexnowKey]` param as "foo.txt") and serves the
 * key file ONLY when the requested segment exactly equals
 * `${INDEXNOW_KEY}.txt` — every other path 404s exactly like it would with no
 * route here, so this does not create an open wildcard route.
 *
 * When INDEXNOW_KEY is unset, this route always 404s (nothing to serve).
 */

interface RouteParams {
  params: Promise<{ indexnowKey: string }>;
}

export const dynamic = 'force-static';
export const revalidate = 86400;

export async function GET(_request: Request, { params }: RouteParams): Promise<Response> {
  const key = process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return new Response('Not found', { status: 404 });
  }

  const { indexnowKey } = await params;
  if (indexnowKey !== `${key}.txt`) {
    return new Response('Not found', { status: 404 });
  }

  return new Response(key, {
    status: 200,
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
}
