const deployed = process.env.DEPLOY_ENV === 'staging' || process.env.DEPLOY_ENV === 'production';
if (!deployed) process.exit(0);

const required = [
  'NEXT_PUBLIC_API_URL',
  'SANCTUM_APP_URL',
  'ORG_SLUG',
  'REVALIDATE_SECRET',
  'SITE_URL',
  'DEPLOY_ENV',
];

if (deployed && !process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() && !process.env.SENTRY_DSN?.trim()) {
  console.log('Sentry is off for the public site. Set NEXT_PUBLIC_SENTRY_DSN and SENTRY_DSN to enable it.');
}

const missing = required.filter((key) => !process.env[key]?.trim());
if (process.env.DEPLOY_ENV === 'production') {
  for (const key of ['NEXT_PUBLIC_API_URL', 'SANCTUM_APP_URL', 'SITE_URL']) {
    const value = process.env[key] || '';
    if (/localhost|127\.0\.0\.1/.test(value)) missing.push(`${key} must not use localhost in production`);
  }
}

if (missing.length) {
  console.error(`Refusing to build the public site:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}
