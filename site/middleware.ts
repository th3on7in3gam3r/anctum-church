import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

function contentSecurityPolicy() {
  const api = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/$/, '');
  const scriptSrc = process.env.NODE_ENV === 'production'
    ? "script-src 'self' 'unsafe-inline' https://www.tiktok.com"
    : "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.tiktok.com";
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    scriptSrc,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://i.ytimg.com https://res.cloudinary.com https://*.tiktokcdn.com https://*.tiktokcdn-us.com",
    "media-src 'self' https://res.cloudinary.com https://www.youtube-nocookie.com",
    "frame-src https://www.youtube-nocookie.com https://www.tiktok.com",
    ['connect-src', "'self'", api, 'https://www.tiktok.com', 'https://*.tiktok.com', 'https://*.sentry.io', 'https://*.ingest.sentry.io'].filter(Boolean).join(' '),
  ].join('; ');
}

export function middleware(_request: NextRequest) {
  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', contentSecurityPolicy());
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=()');
  if (process.env.DEPLOY_ENV === 'staging') {
    response.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
