
import { NextRequest, NextResponse } from 'next/server';
import { match } from '@formatjs/intl-localematcher';
import Negotiator from 'negotiator';

const locales = ['en', 'fr'];
const defaultLocale = 'fr';
const publicPages = ['/login'];

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

  // Gérer la redirection pour la page de connexion
  if (pathname.startsWith('/login')) {
    return;
  }

  // Gérer la redirection pour l'espace admin
  // if (pathname.startsWith('/admin')) {
  //   const sessionCookie = request.cookies.get('session');
  //   if (!sessionCookie) {
  //     return NextResponse.redirect(new URL('/login', request.url));
  //   }
  //   return NextResponse.next();
  // }

  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) {
    return;
  }
  
  // Ignorer les chemins spécifiques à Next.js et les fichiers statiques
  if (pathname.startsWith('/_next') || pathname.includes('.') || pathname.startsWith('/api')) {
    return;
  }

  const locale = getLocale(request);
  request.nextUrl.pathname = `/${locale}${pathname}`;
  
  return NextResponse.redirect(request.nextUrl);
}

export const config = {
  matcher: [
    // Exclure les fichiers statiques et les chemins API
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
