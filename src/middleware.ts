import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const PUBLIC_PATHS = ['/login', '/api/auth/login', '/api/auth/logout'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public paths
  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  // Allow Next.js internals
  if (pathname.startsWith('/_next') || pathname.startsWith('/favicon')) {
    return NextResponse.next();
  }

  const correctPassword = process.env.AUTH_PASSWORD;
  if (!correctPassword) {
    // No auth configured — allow through (dev safety)
    return NextResponse.next();
  }

  const expectedToken = crypto.createHash('sha256').update(correctPassword).digest('hex');
  const cookieToken = req.cookies.get('mc-auth-token')?.value;

  if (cookieToken !== expectedToken) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('from', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
