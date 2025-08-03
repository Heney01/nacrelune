
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
        console.warn("Middleware: Invalid session cookie.");
        return null;
    }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[Middleware] Nouvelle requête pour le chemin : ${pathname}`);

  // 1. Locale Redirection Logic
  const pathnameIsMissingLocale = availableLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname.startsWith('/') ? '' : '/'}${pathname}`, request.url);
    console.log(`[Middleware] Le chemin n'a pas de locale. Redirection vers : ${newUrl.toString()}`);
    return NextResponse.redirect(newUrl);
  }

  // 2. Authentication Logic
  const sessionCookie = request.cookies.get('session')?.value;
  const currentLocale = pathname.split('/')[1] || defaultLocale;
  console.log(`[Middleware] Locale détectée : ${currentLocale}`);


  const isUserAuthPage = pathname === `/${currentLocale}/connexion` || pathname === `/${currentLocale}/inscription`;
  const isAdminLoginPage = pathname === `/${currentLocale}/admin/login`;
  const isAdminPage = pathname.startsWith(`/${currentLocale}/admin`);
  const isFinalizeProfilePage = pathname.startsWith(`/${currentLocale}/finaliser-profil`);

  console.log(`[Middleware] Analyse des pages : isAdminPage=${isAdminPage}, isUserAuthPage=${isUserAuthPage}, isFinalizeProfilePage=${isFinalizeProfilePage}`);

  // If the user is on a user auth page AND is already logged in, redirect to home.
  if (isUserAuthPage && sessionCookie) {
    const decodedToken = await verifyToken(sessionCookie);
    if (decodedToken) {
        console.log('[Middleware] Utilisateur connecté sur une page d\'authentification. Redirection vers l\'accueil.');
        return NextResponse.redirect(new URL(`/${currentLocale}`, request.url));
    }
  }

  // If the user is trying to access a protected page (admin or finalize profile)
  if (isAdminPage || isFinalizeProfilePage) {
    if (!sessionCookie) {
      // Not logged in, redirect to the appropriate login page
      const loginUrl = new URL(`/${currentLocale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
      console.log(`[Middleware] Accès protégé sans session. Redirection vers : ${loginUrl.toString()}`);
      return NextResponse.redirect(loginUrl);
    }

    const decodedToken = await verifyToken(sessionCookie);
    if (!decodedToken) {
        // Invalid cookie, delete it and redirect to login
        const loginUrl = new URL(`/${currentLocale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
        console.log(`[Middleware] Cookie de session invalide. Redirection vers : ${loginUrl.toString()}`);
        const response = NextResponse.redirect(loginUrl);
        response.cookies.delete('session');
        return response;
    }
    
    // If user is trying to access admin login page but is already logged in, redirect to dashboard.
    if(isAdminLoginPage){
        console.log('[Middleware] Administrateur connecté sur la page de login admin. Redirection vers le tableau de bord.');
        return NextResponse.redirect(new URL(`/${currentLocale}/admin/dashboard`, request.url));
    }
  }

  console.log(`[Middleware] Aucune redirection nécessaire. Passage au prochain handler.`);
  return NextResponse.next();
}

export const config = {
  // Matcher ignoring `/_next/` and `/api/`
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
