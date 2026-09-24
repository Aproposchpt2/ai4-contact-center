import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/utils/supabase/middleware';
import { effectiveHost, isAllowedOnAppHost, isAppHost, isBlockedOnOperatorHost, isBlockedOnTenantHost, isOperatorHost, tenantSlugFromHost, APP_HOST_PUBLIC_PATHS } from '@/lib/tenantHost';

const DEMO_SESSION_COOKIE = 'ai4cc_demo_started_at';

export async function middleware(request: NextRequest) {
  // Customer workspaces ({slug}.<root domain>): no sales/marketing pages, no Apropos data mirrors,
  // and the root URL goes straight to the workspace. Tenant membership itself is enforced
  // server-side per request (lib/ai4ccServer.ts), never from anything the browser sends.
  const host = effectiveHost((name) => request.headers.get(name));
  const onTenantHost = tenantSlugFromHost(host) !== null;

  // Generic customer entry (app.<root>): only the workspace finder exists here.
  const onAppHost = isAppHost(host);
  if (onAppHost) {
    const { pathname } = request.nextUrl;
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/find-workspace';
      return NextResponse.redirect(url);
    }
    if (!isAllowedOnAppHost(pathname)) return new NextResponse('Not found', { status: 404 });
  }

  // Operator console (admin.<root>): staff only. Nothing public except /login; the home tenant's
  // owner/admin role is enforced server-side (resolveMembership) for every data request.
  const onOperatorHost = isOperatorHost(host);
  if (onOperatorHost) {
    const { pathname } = request.nextUrl;
    if (isBlockedOnOperatorHost(pathname)) return new NextResponse('Not found', { status: 404 });
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/ops-console';
      return NextResponse.redirect(url);
    }
  }

  if (onTenantHost) {
    const { pathname } = request.nextUrl;
    if (isBlockedOnTenantHost(pathname)) return new NextResponse('Not found', { status: 404 });
    if (pathname === '/') {
      const url = request.nextUrl.clone();
      url.pathname = '/dashboard';
      return NextResponse.redirect(url);
    }
  }

  const response = await updateSession(request, {
    publicPaths: onOperatorHost ? ['/login'] : onAppHost ? APP_HOST_PUBLIC_PATHS : undefined,
  });
  if (onTenantHost || onOperatorHost || onAppHost) response.headers.set('X-Robots-Tag', 'noindex, nofollow');

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
