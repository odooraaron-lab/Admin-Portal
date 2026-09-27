import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, isValidSession } from '@/lib/session';

export async function middleware(req: NextRequest) {
  const ok = await isValidSession(req.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = '/login';
  url.search = '';
  return NextResponse.redirect(url);
}

// Everything is private except login, public APIs (signed or beacon) and static files.
export const config = {
  matcher: ['/((?!login|api/stripe|api/ingest|api/collect|api/cron|_next|favicon|beacon\\.js|robots\\.txt).*)'],
};
