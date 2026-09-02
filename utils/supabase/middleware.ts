/**
 * Supabase middleware helper — refreshes the user session and enforces
 * authenticated access to AI4CC operational/control-plane routes.
 */
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

// Public marketing/sale surface — buyer-facing pages meant to be seen without a login.
const PUBLIC_PATHS = new Set(['/', '/login', '/web-chat', '/acquisition']);
// /api/intake/ authenticates itself via a shared secret header (see pages/api/intake/webhook.ts) —
// it's called machine-to-machine by ElevenLabs, which can't carry a Supabase session cookie.
// /api/public/ is deliberately read-only, minimal-field, no-auth — see pages/api/public/*.
// /platform/ holds the public capability detail pages linked from the homepage.
const PUBLIC_PREFIXES = ['/api/chat/', '/api/intake/', '/api/public/', '/platform/'];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  if (isPublicPath(request.nextUrl.pathname)) return supabaseResponse;

  const { data: { user } } = await supabase.auth.getUser();
  if (user) return supabaseResponse;

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = '/login';
  loginUrl.search = '';
  if (request.nextUrl.pathname !== '/') loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}
