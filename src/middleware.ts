
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from './lib/firebase-admin';
import Negotiator from 'negotiator';
import { match } from '@formatjs/intl-localematcher';

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


export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Locale Redirection Logic
  const pathnameIsMissingLocale = availableLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(
        `/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`,
        request.url
      )
    );
  }

  // Authentication Logic
  const sessionCookie = request.cookies.get('session')?.value;
  const currentLocale = pathname.split('/')[1] || defaultLocale;

  if (pathname.startsWith(`/${currentLocale}/admin`)) {
    if (!sessionCookie) {
      if (pathname !== `/${currentLocale}/admin/login`) {
        return NextResponse.redirect(new URL(`/${currentLocale}/admin/login`, request.url));
      }
    } else {
      try {
        await initAdmin();
        await getAuth().verifySessionCookie(sessionCookie, true);
        if (pathname === `/${currentLocale}/admin/login`) {
          return NextResponse.redirect(new URL(`/${currentLocale}/admin/dashboard`, request.url));
        }
      } catch (error) {
        // Invalid session cookie, redirect to login
         if (pathname !== `/${currentLocale}/admin/login`) {
            const response = NextResponse.redirect(new URL(`/${currentLocale}/admin/login`, request.url));
            response.cookies.delete('session'); // Clear the invalid cookie
            return response;
         }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
