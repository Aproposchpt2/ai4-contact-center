import { type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';

const DEMO_SESSION_COOKIE = 'ai4cc_demo_started_at';

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);

  if (request.nextUrl.pathname === '/demo') {
    const referer = request.headers.get('referer');
    let enteredFromHomepage = false;

    if (referer) {
      try {
        const source = new URL(referer);
        enteredFromHomepage = source.origin === request.nextUrl.origin && source.pathname === '/';
      } catch {
        enteredFromHomepage = false;
      }
    }

    if (enteredFromHomepage) {
      response.cookies.set(DEMO_SESSION_COOKIE, new Date().toISOString(), {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
        path: '/',
        maxAge: 60 * 60,
      });
    }
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Refresh the Supabase session on all routes EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimization)
     * - favicon.ico, site assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
