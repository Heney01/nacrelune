
import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'fr'];
const defaultLocale = 'fr';

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  let languages;
  try {
      languages = new Negotiator({ headers: negotiatorHeaders }).languages();
  } catch (error) {
      return defaultLocale;
  }
  
  try {
    return match(languages, locales, defaultLocale);
  } catch (e) {
    return defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle admin area protection.
  // This part only runs for paths matched by the config below.
  const sessionCookie = request.cookies.get('session');
  if (!sessionCookie) {
    const locale = pathname.split('/')[1] || defaultLocale;
    return NextResponse.redirect(new URL(`/${locale}/login`, request.url));
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
   * - login page itself
   * - and all non-admin pages
   *
   * This is a more explicit way to protect routes and avoids interfering
   * with Next.js internal requests or non-admin pages.
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|login).*)?/admin/:path*'],
};
