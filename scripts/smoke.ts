const site = (process.env.BASE_SITE || '').replace(/\/$/, '');
const app = (process.env.BASE_APP || '').replace(/\/$/, '');
const slug = process.env.PRAYER_ROOM_SLUG || process.env.ORG_SLUG || 'promised-land-christian-center';
const staffToken = process.env.STAFF_TOKEN || process.env.SMOKE_STAFF_TOKEN || '';

const publicRoutes = [
  '/',
  '/about',
  '/leadership',
  '/ministries',
  '/huddles',
  '/beliefs',
  '/events',
  '/gallery',
  '/sermons',
  '/visit',
  '/contact',
  '/prayer',
  '/give',
];

const failures: string[] = [];

function fail(message: string) {
  failures.push(message);
  console.error(message);
}

async function textOf(url: string): Promise<{ status: number; bytes: number; body: string }> {
  const response = await fetch(url, { redirect: 'follow' });
  const body = await response.text();
  return { status: response.status, bytes: Buffer.byteLength(body), body };
}

function rejectSampleCopy(label: string, body: string) {
  for (const phrase of ['[PLACEHOLDER]', 'Miracle Center', 'Pastor Kenneth']) {
    if (body.includes(phrase)) fail(`${label} contains sample copy`);
  }
}

if (!site || !app) {
  console.error('Set BASE_SITE and BASE_APP.');
  process.exit(1);
}

for (const route of publicRoutes) {
  try {
    const page = await textOf(`${site}${route}`);
    if (page.status !== 200) fail(`${route} returned ${page.status}`);
    rejectSampleCopy(route, page.body);
    if (route === '/' && page.bytes >= 300 * 1024) fail(`home is ${page.bytes} bytes`);
    if (route === '/gallery' && !page.body.includes('Moments in the')) fail('/gallery did not render');
  } catch (error) {
    fail(`${route} failed: ${error instanceof Error ? error.message : 'request failed'}`);
  }
}

try {
  const health = await textOf(`${app}/api/health`);
  const payload = JSON.parse(health.body) as { ok?: boolean; database?: string };
  if (health.status !== 200 || payload.ok !== true || payload.database !== 'configured') {
    fail(`/api/health is not ok (${health.status})`);
  }
} catch (error) {
  fail(`/api/health failed: ${error instanceof Error ? error.message : 'request failed'}`);
}

if (!staffToken) {
  fail('/api/health/db needs STAFF_TOKEN');
} else {
  try {
    const response = await fetch(`${app}/api/health/db`, {
      headers: {
        Authorization: `Bearer ${staffToken}`,
        ...(process.env.SMOKE_ORG_ID ? { 'x-organization-id': process.env.SMOKE_ORG_ID } : {}),
      },
    });
    const payload = await response.json() as { ok?: boolean };
    if (response.status !== 200 || payload.ok !== true) fail(`/api/health/db returned ${response.status}`);
  } catch (error) {
    fail(`/api/health/db failed: ${error instanceof Error ? error.message : 'request failed'}`);
  }
}

try {
  const join = await textOf(`${app}/join/${slug}`);
  if (join.status !== 200) fail(`/join/${slug} returned ${join.status}`);
  if (!join.body.includes('Promised Land Christian Center')) {
    fail(`/join/${slug} did not render the church name`);
  }
  rejectSampleCopy(`/join/${slug}`, join.body);
} catch (error) {
  fail(`/join/${slug} failed: ${error instanceof Error ? error.message : 'request failed'}`);
}

try {
  const response = await fetch(`${app}/api/public/${slug}/live`);
  const payload = await response.json() as unknown;
  if (response.status !== 200) fail(`/api/public/${slug}/live returned ${response.status}`);
  const keys = new Set<string>();
  const walk = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      walk(child);
    }
  };
  walk(payload);
  for (const key of ['email', 'phone', 'firstName', 'lastName', 'guestName', 'userId', 'realtimeIdentity']) {
    if (keys.has(key)) fail(`/api/public/${slug}/live includes ${key}`);
  }
} catch (error) {
  fail(`/api/public/${slug}/live failed: ${error instanceof Error ? error.message : 'request failed'}`);
}

if (failures.length) {
  console.error(`${failures.length} smoke checks failed`);
  process.exit(1);
}

console.log('Smoke checks passed');
