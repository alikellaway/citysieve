import { NextRequest, NextResponse } from 'next/server';

// Lightweight middleware: checks for session cookie existence.
// API routes perform the authoritative auth check via `await auth()`.
export function middleware(request: NextRequest) {
  const sessionCookie =
    request.cookies.get('authjs.session-token') ??
    request.cookies.get('__Secure-authjs.session-token');

  if (!sessionCookie) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/survey/:path*'],
};
