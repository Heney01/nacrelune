
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const locale = request.nextUrl.pathname.split('/')[1] || 'fr';

  if (!sessionCookie) {
    const loginUrl = new URL(`/${locale}/login`, request.url);
    // Pass the original destination as a search parameter for redirection after login.
    loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths under /admin, but exclude:
   * - /admin/login (or any other public admin pages)
   * - API routes
   * - Static files
   * - Image optimization files
   * - Favicon
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
