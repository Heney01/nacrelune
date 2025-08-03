

import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get('session');
  const locale = request.nextUrl.pathname.split('/')[1] || 'fr';

  if (request.nextUrl.pathname.startsWith('/admin')) {
      if (!sessionCookie) {
        const loginUrl = new URL(`/${locale}/admin/login`, request.url);
        loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
        return NextResponse.redirect(loginUrl);
      }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
