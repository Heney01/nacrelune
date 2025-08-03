
import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const availableLocales = ['en', 'fr'];
const defaultLocale = 'fr';

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages();

  try {
    return match(languages, availableLocales, defaultLocale);
  } catch (e) {
    return defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Isolate admin logic
  if (pathname.includes('/admin')) {
      // Allow login page to be accessed
      if (pathname.endsWith('/admin/login')) {
          return NextResponse.next();
      }
      
      // Protect all other admin pages
      const sessionCookie = request.cookies.get('session');
      if (!sessionCookie) {
          const localeFromPath = pathname.split('/')[1] || defaultLocale;
          const loginUrl = new URL(`/${localeFromPath}/admin/login`, request.url);
          return NextResponse.redirect(loginUrl);
      }
      // If session exists, proceed
      return NextResponse.next();
  }

  // Handle locale redirection for all other pages
  const pathnameIsMissingLocale = availableLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
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
   */
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
