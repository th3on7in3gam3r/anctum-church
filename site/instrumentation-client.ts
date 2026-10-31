import * as Sentry from '@sentry/nextjs';

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
if (!dsn && process.env.NEXT_PUBLIC_DEPLOY_ENV) {
  console.info('Sentry is off for the public site. Set NEXT_PUBLIC_SENTRY_DSN to enable it.');
}
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NEXT_PUBLIC_DEPLOY_ENV || process.env.NODE_ENV,
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE || process.env.VERCEL_GIT_COMMIT_SHA,
    sendDefaultPii: false,
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
