export const API_PRODUCTION_KEYS = [
  'DATABASE_URL',
  'PUBLIC_SITE_ORIGINS',
  'APP_URL',
  'SITE_REVALIDATE_URL',
  'REVALIDATE_SECRET',
  'CRON_SECRET',
  'LIVEKIT_URL',
  'LIVEKIT_API_KEY',
  'LIVEKIT_API_SECRET',
  'CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY',
  'VITE_CLERK_PUBLISHABLE_KEY',
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
  'PUBLIC_SITE_URL',
  'DEPLOY_ENV',
] as const;

export function isDeployedEnv(source: NodeJS.ProcessEnv = process.env): boolean {
  return source.DEPLOY_ENV === 'staging' || source.DEPLOY_ENV === 'production';
}

export function parsePublicSiteOrigins(raw: string | undefined): string[] {
  return (raw || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

export function originIsLocal(origin: string): boolean {
  try {
    const hostname = new URL(origin).hostname;
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
  } catch {
    return false;
  }
}

export function releaseName(source: NodeJS.ProcessEnv = process.env): string | undefined {
  const value = source.SENTRY_RELEASE || source.RENDER_GIT_COMMIT || source.VERCEL_GIT_COMMIT_SHA;
  const trimmed = value?.trim();
  return trimmed || undefined;
}

/** A demo deploy runs the sample church only. It needs a database and a secret, nothing else. */
export const DEMO_REQUIRED_KEYS = ['DATABASE_URL', 'APP_URL', 'DEPLOY_ENV', 'DEMO_SECRET'] as const;

export function productionConfigProblems(source: NodeJS.ProcessEnv = process.env): string[] {
  if (!isDeployedEnv(source)) return [];
  const problems: string[] = [];
  if (source.DEMO_MODE === 'true') {
    for (const key of DEMO_REQUIRED_KEYS) {
      if (key === 'APP_URL' && source.RENDER_EXTERNAL_URL?.trim()) continue;
      if (!source[key]?.trim()) problems.push(`${key} is required`);
    }
    if ((source.DEMO_SECRET || '').trim().length < 16) problems.push('DEMO_SECRET must be at least 16 characters');
    if (source.DEPLOY_ENV === 'production') problems.push('DEMO_MODE must not be on when DEPLOY_ENV=production. Use DEPLOY_ENV=staging for the demo.');
    return problems;
  }
  for (const key of API_PRODUCTION_KEYS) {
    if (!source[key]?.trim()) problems.push(`${key} is required`);
  }
  if (source.DEPLOY_ENV !== 'staging' && source.DEPLOY_ENV !== 'production') {
    problems.push('DEPLOY_ENV must be staging or production');
  }
  const databaseUrl = source.DATABASE_URL || '';
  if (databaseUrl && !/[?&]connection_limit=\d+/.test(databaseUrl)) {
    problems.push('DATABASE_URL must include connection_limit=10 (use the pooled URL)');
  }
  if (databaseUrl && !/[?&]pool_timeout=\d+/.test(databaseUrl)) {
    problems.push('DATABASE_URL must include pool_timeout=20 (use the pooled URL)');
  }
  if (source.DEPLOY_ENV === 'production') {
    for (const origin of parsePublicSiteOrigins(source.PUBLIC_SITE_ORIGINS)) {
      if (originIsLocal(origin)) problems.push(`PUBLIC_SITE_ORIGINS must not include ${origin} in production`);
    }
    for (const key of ['APP_URL', 'PUBLIC_SITE_URL', 'SITE_REVALIDATE_URL'] as const) {
      const value = source[key] || '';
      if (value && originIsLocal(value)) problems.push(`${key} must not use a localhost origin in production`);
    }
    if (source.ALLOW_PLACEHOLDER === 'true') {
      problems.push('ALLOW_PLACEHOLDER must not be set when DEPLOY_ENV=production');
    }
  }
  return problems;
}

export function logOptionalFeatures(source: NodeJS.ProcessEnv = process.env): void {
  if (!isDeployedEnv(source)) return;
  if (!source.SENTRY_DSN?.trim()) {
    console.log('Sentry is off for the API. Set SENTRY_DSN to enable it.');
  }
  if (!source.VITE_SENTRY_DSN?.trim()) {
    console.log('Sentry is off for Sanctum. Set VITE_SENTRY_DSN to enable it.');
  }
  if (!source.RESEND_API_KEY?.trim() || !source.GALLERY_REVIEW_FROM?.trim()) {
    console.log('Gallery review email is off. Set RESEND_API_KEY and GALLERY_REVIEW_FROM to enable it.');
  }
}

export function assertApiProductionEnv(source: NodeJS.ProcessEnv = process.env): void {
  const problems = productionConfigProblems(source);
  if (!problems.length) return;
  throw new Error(`Refusing to boot. Fix the deployed configuration:\n- ${problems.join('\n- ')}`);
}

export function allowedPublicOrigins(source: NodeJS.ProcessEnv = process.env): string[] {
  const listed = parsePublicSiteOrigins(source.PUBLIC_SITE_ORIGINS);
  const origins = listed.length
    ? listed
    : isDeployedEnv(source)
      ? []
      : [(source.SITE_ORIGIN || 'http://127.0.0.1:3002').replace(/\/$/, '')];
  if (source.DEPLOY_ENV === 'production' || source.NODE_ENV === 'production') {
    return origins.filter((origin) => !originIsLocal(origin));
  }
  return origins;
}
