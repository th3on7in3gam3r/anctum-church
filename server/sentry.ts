import * as Sentry from '@sentry/node';
import { releaseName } from './productionEnv.ts';

export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN?.trim();
  if (!dsn) return;
  Sentry.init({
    dsn,
    environment: process.env.DEPLOY_ENV || process.env.NODE_ENV,
    release: releaseName(),
    sendDefaultPii: false,
  });
}

export function captureServerError(error: unknown): void {
  if (!process.env.SENTRY_DSN?.trim()) return;
  Sentry.captureException(error);
}
