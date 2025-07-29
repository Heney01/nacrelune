
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'fr'];
const defaultLocale = 'fr';

function getLocaleFromPathname(pathname: string): string {
    const locale = pathname.split('/')[1];
    if (locales.includes(locale)) {
        return locale;
    }
    return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  if (!sessionCookie) {
    const locale = getLocaleFromPathname(pathname);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Add a redirect query parameter if trying to access a protected route
    if (pathname.includes('/admin')) {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   *
   * This ensures that the middleware ONLY runs on pages and not on static assets or API routes.
   * We apply the protection logic inside the middleware itself.
   */
  matcher: [
    '/admin/:path*',
    '/en/admin/:path*',
    '/fr/admin/:path*',
  ],
};
