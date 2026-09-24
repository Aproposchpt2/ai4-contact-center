import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { isBlockedOnTenantHost, tenantSlugFromHost } from '@/lib/tenantHost';

const DEMO_SESSION_COOKIE = 'ai4cc_demo_started_at';

export async function middleware(request: NextRequest) {
  // Customer workspaces ({slug}.<root domain>): no sales/marketing pages, no Apropos data mirrors,
  // and the root URL goes straight to the workspace. Tenant membership itself is enforced
  // server-side per request (lib/ai4ccServer.ts), never from anything the browser sends.
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  const onTenantHost = tenantSlugFromHost(host) !== null;
  if (onTenantHost) {
    const { pathname } = request.nextUrl;
    if (isBlockedOnTenantHost(pathname)) return new NextResponse('Not found', { status: 404 });
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  const response = await updateSession(request);
  if (onTenantHost) response.headers.set('X-Robots-Tag', 'noindex, nofollow');

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
