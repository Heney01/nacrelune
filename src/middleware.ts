
import { NextRequest, NextResponse } from 'next/server';
import { getAuth } from 'firebase-admin/auth';
import { initAdmin } from './lib/firebase-admin';

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
  const sessionCookie = request.cookies.get('session')?.value;
  const { pathname } = request.nextUrl;
  const locale = pathname.split('/')[1] || 'fr';

  const isAuthPage = pathname.includes('/connexion') || pathname.includes('/inscription');
  const isAdminPage = pathname.includes('/admin');
  const isFinalizeProfilePage = pathname.includes('/finaliser-profil');

  if (isAuthPage && sessionCookie) {
    // If user is logged in, redirect from auth pages to home
    const decodedToken = await verifyToken(sessionCookie);
    if (decodedToken) {
        return NextResponse.redirect(new URL(`/${locale}`, request.url));
    }
  }

  if (isAdminPage || isFinalizeProfilePage) {
    if (!sessionCookie) {
      const loginUrl = new URL(`/${locale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const decodedToken = await verifyToken(sessionCookie);
    if (!decodedToken) {
        // Invalid cookie, redirect to login
        const loginUrl = new URL(`/${locale}/${isAdminPage ? 'admin/login' : 'connexion'}`, request.url);
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
