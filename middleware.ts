import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

// Cookie the client reads to apply region-specific consent without making pages
// dynamic. ISO-3166 alpha-2 (e.g. "US", "DE"), or "ZZ" when unknown.
const COUNTRY_COOKIE = 'visitor_country';

const ADSENSE_CRAWLER = /Mediapartners-Google|AdsBot-Google/i;

export async function middleware(request: NextRequest) {
  const ua = request.headers.get('user-agent') ?? '';
  if (ADSENSE_CRAWLER.test(ua)) {
    console.log(
      'adsense-crawl ' +
        JSON.stringify({
          p: request.nextUrl.pathname,
          d: process.env.VERCEL_DEPLOYMENT_ID ?? null,
          ua: /Mediapartners-Google/i.test(ua) ? 'mp' : 'adsbot',
        }),
    );
  }

  // Preserve the existing Supabase session-refresh response (it may carry
  // refreshed auth cookies) and attach the visitor country cookie onto it.
  const response = await updateSession(request);

  // Vercel injects the geo header at the edge. Falls back to "ZZ" (unknown →
  // the client sends "Manage consent" to the Google CMP, as for EEA) when absent
  // (local dev, other hosts). Readable (not httpOnly) so the client consent logic can read it.
  const country = request.headers.get('x-vercel-ip-country') || 'ZZ';
  response.cookies.set(COUNTRY_COOKIE, country, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24, // 1 day; re-derived on the next visit
  });

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/og|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
