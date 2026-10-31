import { describe, expect, it } from 'vitest';
import {
  allowedPublicOrigins,
  originIsLocal,
  productionConfigProblems,
} from '../server/productionEnv.ts';

const complete = {
  DEPLOY_ENV: 'production',
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://user:pass@pooler.example/sanctum?sslmode=require&connection_limit=10&pool_timeout=20',
  PUBLIC_SITE_ORIGINS: 'https://www.example.org',
  PUBLIC_SITE_URL: 'https://www.example.org',
  APP_URL: 'https://app.example.org',
  SITE_REVALIDATE_URL: 'https://www.example.org/api/revalidate',
  REVALIDATE_SECRET: 'secret',
  CRON_SECRET: 'cron',
  LIVEKIT_URL: 'wss://example.livekit.cloud',
  LIVEKIT_API_KEY: 'key',
  LIVEKIT_API_SECRET: 'secret',
  CLERK_PUBLISHABLE_KEY: 'pk_live_example',
  CLERK_SECRET_KEY: 'sk_live_example',
  VITE_CLERK_PUBLISHABLE_KEY: 'pk_live_example',
  VITE_SENTRY_DSN: 'https://public@sentry.example/1',
  CLOUDINARY_CLOUD_NAME: 'cloud',
  CLOUDINARY_API_KEY: 'key',
  CLOUDINARY_API_SECRET: 'secret',
  RESEND_API_KEY: 're_example',
  GALLERY_REVIEW_FROM: 'Media <media@example.org>',
  SENTRY_DSN: 'https://public@sentry.example/2',
};

describe('deployed configuration', () => {
  it('accepts a complete production environment', () => {
    expect(productionConfigProblems(complete)).toEqual([]);
  });

  it('lists every missing production key and rejects a local site origin', () => {
    const problems = productionConfigProblems({
      DEPLOY_ENV: 'production',
      PUBLIC_SITE_ORIGINS: 'http://localhost:3002',
      DATABASE_URL: 'postgresql://user:pass@localhost/sanctum',
      ALLOW_PLACEHOLDER: 'true',
    });
    expect(problems.some((item) => item.startsWith('APP_URL'))).toBe(true);
    expect(problems.some((item) => item.includes('connection_limit'))).toBe(true);
    expect(problems.some((item) => item.includes('pool_timeout'))).toBe(true);
    expect(problems.some((item) => item.includes('localhost'))).toBe(true);
    expect(problems.some((item) => item.includes('ALLOW_PLACEHOLDER'))).toBe(true);
  });

  it('leaves email and Sentry optional', () => {
    const { SENTRY_DSN: _dsn, VITE_SENTRY_DSN: _vite, RESEND_API_KEY: _resend, GALLERY_REVIEW_FROM: _from, ...withoutOptional } = complete;
    expect(productionConfigProblems(withoutOptional)).toEqual([]);
  });

  it('allows the placeholder flag on staging and keeps localhost out of production CORS', () => {
    expect(productionConfigProblems({ ...complete, DEPLOY_ENV: 'staging', ALLOW_PLACEHOLDER: 'true' })).toEqual([]);
    expect(originIsLocal('http://127.0.0.1:3002')).toBe(true);
    expect(allowedPublicOrigins({
      NODE_ENV: 'production',
      DEPLOY_ENV: 'production',
      PUBLIC_SITE_ORIGINS: 'https://www.example.org, http://localhost:3002',
    })).toEqual(['https://www.example.org']);
    expect(allowedPublicOrigins({ NODE_ENV: 'development' })).toEqual(['http://127.0.0.1:3002']);
  });
});

describe('demo deploys', () => {
  it('needs only a database, app URL and a long secret', () => {
    expect(
      productionConfigProblems({ DEPLOY_ENV: 'staging', DEMO_MODE: 'true', DATABASE_URL: 'postgres://x', APP_URL: 'https://demo.example', DEMO_SECRET: '0123456789abcdef' })
    ).toEqual([]);
  });

  it('refuses a short secret and refuses production', () => {
    const problems = productionConfigProblems({ DEPLOY_ENV: 'production', DEMO_MODE: 'true', DATABASE_URL: 'postgres://x', APP_URL: 'https://demo.example', DEMO_SECRET: 'short' });
    expect(problems.some((problem) => problem.includes('16 characters'))).toBe(true);
    expect(problems.some((problem) => problem.includes('DEPLOY_ENV=production'))).toBe(true);
  });
});
