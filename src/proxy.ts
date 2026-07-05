import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { jwtVerify } from 'jose';

const intlMiddleware = createMiddleware(routing);

export async function proxy(request: NextRequest) {
  const response = intlMiddleware(request);
  const pathname = request.nextUrl.pathname;
  
  // Define protected pages (anything under dashboard, customers, daily-entry, billing, payments, reports, settings)
  const isProtectedRoute = pathname.includes('/dashboard') || 
                           pathname.includes('/customers') || 
                           pathname.includes('/daily-entry') || 
                           pathname.includes('/billing') || 
                           pathname.includes('/payments') || 
                           pathname.includes('/reports') || 
                           pathname.includes('/settings');

  if (isProtectedRoute) {
    const token = request.cookies.get('auth_token')?.value;
    const segment = pathname.split('/')[1];
    const locale = routing.locales.includes(segment as any) ? segment : routing.defaultLocale;
    
    if (!token) {
      const url = new URL(`/${locale}/login`, request.url);
      return NextResponse.redirect(url);
    }
    
    try {
      const secret = new TextEncoder().encode(process.env.JWT_SECRET || 'dairybook_secure_session_secret_2026_07');
      await jwtVerify(token, secret);
      return response;
    } catch (err) {
      const url = new URL(`/${locale}/login`, request.url);
      const redirectResponse = NextResponse.redirect(url);
      redirectResponse.cookies.delete('auth_token');
      return redirectResponse;
    }
  }
  
  return response;
}

export const config = {
  // Match only internationalized pathnames and exclude assets/api
  matcher: ['/', '/(en|hi)/:path*', '/((?!api|_next|_vercel|.*\\..*).*)']
};
