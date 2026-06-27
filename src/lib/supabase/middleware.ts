import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  // Trim guards against malformed values (e.g. trailing newline from copy-paste),
  // which would otherwise pass the falsy check but throw inside `new URL()`.
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // If Supabase isn't configured, skip session refresh instead of crashing the
  // entire site. `createServerClient` throws synchronously on falsy URL/key, and
  // because the middleware matcher covers nearly every route, an unguarded throw
  // takes the whole site down with MIDDLEWARE_INVOCATION_FAILED (HTTP 500).
  // Public pages must still render; auth-gated features degrade gracefully.
  // See docs/PROGRESS.md → "인시던트 로그" [2026-06-27].
  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '[middleware] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skipping Supabase session refresh.'
    );
    return supabaseResponse;
  }

  try {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    });

    await supabase.auth.getUser();
  } catch (error) {
    // Malformed config or Supabase unreachable: don't take the whole site down.
    // Pass the request through unauthenticated rather than returning a 500.
    console.error('[middleware] Supabase session refresh failed:', error);
    return NextResponse.next({ request });
  }

  return supabaseResponse;
}
