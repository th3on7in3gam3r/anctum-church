import * as Sentry from '@sentry/nextjs';

export async function register() {
  const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) {
    if (process.env.DEPLOY_ENV === 'staging' || process.env.DEPLOY_ENV === 'production') {
      console.log('Sentry is off for the public site server. Set SENTRY_DSN to enable it.');
    }
    return;
  }
  Sentry.init({
    dsn,
    environment: process.env.DEPLOY_ENV || process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA || process.env.SENTRY_RELEASE,
    sendDefaultPii: false,
  });
}

export const onRequestError = Sentry.captureRequestError;
