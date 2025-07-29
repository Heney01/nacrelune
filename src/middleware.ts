
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const locale = request.nextUrl.pathname.split('/')[1] || 'fr';

  // We only want to protect routes under /admin
  if (!request.nextUrl.pathname.includes('/admin')) {
    return NextResponse.next();
  }

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
   * Match all request paths except for the ones starting with:
   * - api (API routes)
   * - _next/static (static files)
   * - _next/image (image optimization files)
   * - favicon.ico (favicon file)
   * - login
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)'],
};
