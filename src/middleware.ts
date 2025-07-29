
import { NextRequest, NextResponse } from 'next/server';

const locales = ['en', 'fr'];
const defaultLocale = 'fr';

function getLocale(request: NextRequest): string {
  const acceptLanguage = request.headers.get('accept-language');
  if (acceptLanguage) {
    const languages = acceptLanguage.split(',').map(lang => lang.split(';')[0]);
    for (const lang of languages) {
      if (locales.includes(lang)) {
        return lang;
      }
    }
  }
  
  const pathnameLocale = request.nextUrl.pathname.split('/')[1];
  if (locales.includes(pathnameLocale)) {
    return pathnameLocale;
  }
  
  return defaultLocale;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = request.cookies.get('session');

  // If there's no session cookie, redirect to the login page for the appropriate locale.
  if (!sessionCookie) {
    const locale = getLocale(request);
    const loginUrl = new URL(`/${locale}/login`, request.url);
    
    // Preserve the original path as a redirect parameter.
    loginUrl.searchParams.set('redirect', pathname);
    
    return NextResponse.redirect(loginUrl);
  }

  // If the session is valid, continue to the requested page.
  return NextResponse.next();
}

export const config = {
  /*
   * Match all request paths under /admin, but exclude static files, 
   * image optimization files, and API routes. This prevents the middleware 
   * from running on asset requests or internal Next.js requests,
   * which is crucial for Server Actions to work correctly without being
   * incorrectly redirected.
   */
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
