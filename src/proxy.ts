import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Next.js 16 Proxy (formerly Middleware).
 *
 * - Redirects authenticated users away from /login and /signup.
 * - Adds baseline security headers to all responses.
 *
 * Route protection for app data happens inside API route handlers via
 * `getServerSession` — this proxy only handles optimistic UX redirects.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const token = process.env.NEXTAUTH_SECRET
    ? await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
    : null;

  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/signup');

  // Signed-in users don't need the login/signup pages
  if (token && isAuthPage) {
    const url = new URL('/dashboard/all', request.url);
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  // Baseline security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');

  return response;
}

export const config = {
  // Skip static assets, images, and API routes (auth handled server-side)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)'],
};
