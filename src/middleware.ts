
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
  const { pathname } = request.nextUrl;

  // If it's a server action, let it pass.
   if (request.headers.get('x-next-action')) {
    return NextResponse.next();
  }

  // Handle /login page, no redirection needed.
  if (pathname.startsWith('/login')) {
    return NextResponse.next();
  }

  // Handle admin area protection.
  if (pathname.startsWith('/admin')) {
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return NextResponse.next();
  }
  
  // Ignore Next.js-specific paths and static files.
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // Redirect to the default locale.
  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Exclude static files and API paths.
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
