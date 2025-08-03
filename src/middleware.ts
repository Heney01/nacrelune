
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

  // Step 1: Handle root redirection
  if (pathname === '/') {
    const locale = getLocale(request);
    return NextResponse.redirect(new URL(`/${locale}`, request.url));
  }
  
  // Step 2: Check if the path is missing a locale
  const pathnameIsMissingLocale = availableLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    // If it's a file or API route, do nothing
    if (pathname.includes('.') || pathname.startsWith('/api')) {
        return NextResponse.next();
    }
    // Otherwise, redirect to the default locale
    const locale = getLocale(request);
    return NextResponse.redirect(
      new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url)
    );
  }

  // Step 3: Handle authentication for protected routes
  const sessionCookie = request.cookies.get('session')?.value;
  const currentLocale = pathname.split('/')[1] || defaultLocale;

  const isAuthPage = pathname.includes('/connexion') || pathname.includes('/inscription');
  const isAdminPage = pathname.includes('/admin');
  const isFinalizeProfilePage = pathname.includes('/finaliser-profil');

  if (isAuthPage && sessionCookie) {
    // If user is logged in, redirect from auth pages to home
    const decodedToken = await verifyToken(sessionCookie);
    if (decodedToken) {
        return NextResponse.redirect(new URL(`/${currentLocale}`, request.url));
    }
  }

  if (isAdminPage || isFinalizeProfilePage) {
    if (!sessionCookie) {
      const loginUrl = new URL(`/${currentLocale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const decodedToken = await verifyToken(sessionCookie);
    if (!decodedToken) {
        // Invalid cookie, redirect to login
        const loginUrl = new URL(`/${currentLocale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
        loginUrl.searchParams.set('redirect', pathname);
        const response = NextResponse.redirect(loginUrl);
        // Clear the invalid cookie
        response.cookies.delete('session');
        return response;
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
