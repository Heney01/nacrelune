
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


async function verifyToken(sessionCookie: string) {
    try {
        await initAdmin();
        const decodedToken = await getAuth().verifySessionCookie(sessionCookie, true);
        return decodedToken;
    } catch (error) {
        console.warn("Middleware: Invalid session cookie.", error);
        return null;
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Locale Redirection Logic
  const pathnameIsMissingLocale = availableLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(`/${locale}${pathname}`, request.url)
    );
  }

  // 2. Authentication Logic
  const sessionCookie = request.cookies.get('session')?.value;
  const currentLocale = pathname.split('/')[1] || defaultLocale;

  const isUserAuthPage = [`/${currentLocale}/connexion`, `/${currentLocale}/inscription`].includes(pathname);
  const isAdminPage = pathname.startsWith(`/${currentLocale}/admin`);
  const isFinalizeProfilePage = pathname.startsWith(`/${currentLocale}/finaliser-profil`);

  // If the user is on a user auth page AND is already logged in, redirect to home.
  if (isUserAuthPage && sessionCookie) {
    const decodedToken = await verifyToken(sessionCookie);
    if (decodedToken) {
        return NextResponse.redirect(new URL(`/${currentLocale}`, request.url));
    }
  }

  // If the user is trying to access a protected page (admin or finalize profile)
  if (isAdminPage || isFinalizeProfilePage) {
    if (!sessionCookie) {
      // Not logged in, redirect to the appropriate login page
      const loginUrl = new URL(`/${currentLocale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
      return NextResponse.redirect(loginUrl);
    }

    const decodedToken = await verifyToken(sessionCookie);
    if (!decodedToken) {
        // Invalid cookie, delete it and redirect to login
        const loginUrl = new URL(`/${currentLocale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('session');
        return response;
    }
    // If user is trying to access admin login page but is already logged in, redirect to dashboard.
    // This case is implicitly handled for user auth pages above. We only need to check for admin login page here.
    if(pathname === `/${currentLocale}/admin/login`){
        return NextResponse.redirect(new URL(`/${currentLocale}/admin/dashboard`, request.url));
    }
  }


  return NextResponse.next();
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
