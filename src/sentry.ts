import * as Sentry from '@sentry/react';

const dsn = import.meta.env.VITE_SENTRY_DSN;
if (!dsn && import.meta.env.PROD) {
  console.info('Sentry is off for Sanctum. Set VITE_SENTRY_DSN to enable it.');
}
if (dsn) {
  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_DEPLOY_ENV || import.meta.env.MODE,
    release: import.meta.env.VITE_SENTRY_RELEASE || undefined,
    sendDefaultPii: false,
  });
}
