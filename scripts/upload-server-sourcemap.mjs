import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const deployed = process.env.DEPLOY_ENV === 'staging' || process.env.DEPLOY_ENV === 'production';
const ready = process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT_API;
if (!ready) {
  if (deployed) {
    console.warn('Server source maps were not uploaded. Set SENTRY_AUTH_TOKEN, SENTRY_ORG, and SENTRY_PROJECT_API.');
  }
  await removeSourceMaps(path.resolve('dist'));
  process.exit(0);
}

const release = process.env.SENTRY_RELEASE || process.env.RENDER_GIT_COMMIT || 'local';
const result = spawnSync(
  'npx',
  [
    '--no-install',
    '@sentry/cli',
    'sourcemaps',
    'upload',
    '--release',
    release,
    '--org',
    process.env.SENTRY_ORG,
    '--project',
    process.env.SENTRY_PROJECT_API,
    'dist/server.mjs',
    'dist/server.mjs.map',
  ],
  { stdio: 'inherit' }
);
if ((result.status ?? 1) !== 0) process.exit(result.status ?? 1);
await removeSourceMaps(path.resolve('dist'));

async function removeSourceMaps(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  await Promise.all(entries.map(async (entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return removeSourceMaps(full);
    if (entry.name.endsWith('.map')) await unlink(full);
  }));
}
