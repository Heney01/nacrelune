
import { NextRequest, NextResponse } from 'next/server';

// This middleware redirects the root path to the default locale.
// This is a temporary solution to ensure the app starts.
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If the request is for the root, redirect to the default locale.
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/en', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
