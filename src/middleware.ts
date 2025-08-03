
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
  
  const pathnameIsMissingLocale = availableLocales.every(
    (locale) => !pathname.startsWith(`/${locale}/`) && pathname !== `/${locale}`
  );

  // Gérer la redirection depuis la racine ou les chemins sans locale
  if (pathnameIsMissingLocale) {
    const locale = getLocale(request);
    
    // Si la requête est pour la racine, on redirige vers la page d'accueil de la locale détectée.
    // Pour les autres chemins, on ajoute le préfixe de la locale.
    const newPath = pathname === '/' ? '' : pathname;
    return NextResponse.redirect(new URL(`/${locale}${newPath}`, request.url));
  }

  // Logique de protection pour l'espace admin
  if (pathname.includes('/admin')) {
      const sessionCookie = request.cookies.get('session');
      if (!sessionCookie) {
          const localeFromPath = pathname.split('/')[1] || defaultLocale;
          const loginUrl = new URL(`/${localeFromPath}/admin/login`, request.url);
          return NextResponse.redirect(loginUrl);
      }
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
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|admin/login).*)'],
};
