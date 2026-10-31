import { createHash } from 'node:crypto';
import { readFileSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'dotenv';

const parsed = parse(readFileSync('.env'));
for (const name of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET', 'DATABASE_URL', 'REVALIDATE_SECRET']) {
  if (parsed[name]) process.env[name] = parsed[name];
}

type Uploaded = { url: string; storageKey: string; width: number; height: number };

function credentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Cloudinary is not configured');
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.keys(params).sort().map((key) => `${key}=${params[key]}`).join('&');
  return createHash('sha1').update(serialized + apiSecret).digest('hex');
}

function safeFailure(status: number, message: string) {
  if (/unknown api key/i.test(message)) return new Error('Cloudinary rejected the API key');
  if (/invalid signature/i.test(message)) return new Error('Cloudinary rejected the upload signature');
  if (/cloud name/i.test(message)) return new Error('Cloudinary rejected the cloud name');
  return new Error(`Cloudinary request failed (${status})`);
}

async function uploadBytes(bytes: Buffer, filename: string, folder: string): Promise<Uploaded> {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const body = new FormData();
  body.append('file', new Blob([new Uint8Array(bytes)]), filename);
  body.append('api_key', apiKey);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('signature', sign(params, apiSecret));
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body });
  const payload = await response.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; error?: { message?: string } };
  if (!response.ok || !payload.secure_url || !payload.public_id) {
    throw safeFailure(response.status, payload.error?.message || '');
  }
  return { url: payload.secure_url, storageKey: payload.public_id, width: payload.width || 0, height: payload.height || 0 };
}

async function destroyAsset(publicId: string) {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  const body = new URLSearchParams({
    public_id: publicId,
    timestamp: String(timestamp),
    api_key: apiKey,
    signature: sign({ public_id: publicId, timestamp }, apiSecret),
  });
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body });
  if (!response.ok) throw safeFailure(response.status, '');
  const payload = await response.json() as { result?: string };
  if (payload.result !== 'ok') throw new Error('Cloudinary did not delete the test image');
}

async function confirmUrl(url: string) {
  const response = await fetch(url, { method: 'GET' });
  const type = response.headers.get('content-type') || '';
  if (!response.ok || !type.startsWith('image/')) throw new Error(`Hosted image was not reachable (${response.status})`);
  await response.arrayBuffer();
}

const root = path.resolve('.');
const localFiles = [
  { storageKey: 'local:leaders/pastor-grace.jpg', file: 'public/leaders/pastor-grace.jpg', folder: 'plcc/leaders' },
  { storageKey: 'local:leaders/pastor-kennedy.jpg', file: 'public/leaders/pastor-kennedy.jpg', folder: 'plcc/leaders' },
  { storageKey: 'local:archive/1.jpg', file: 'public/archive/1.jpg', folder: '' },
  { storageKey: 'local:archive/index.jpg', file: 'public/archive/index.jpg', folder: '' },
  { storageKey: 'local:archive/6.jpg', file: 'public/archive/6.jpg', folder: '' },
  { storageKey: 'local:archive/3.jpg', file: 'public/archive/3.jpg', folder: '' },
];

async function main() {
  const test = await uploadBytes(
    Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64'),
    'upload-check.png',
    'plcc/tests',
  );
  await confirmUrl(test.url);
  await destroyAsset(test.storageKey);
  console.log('test upload reachable and removed');

  const { getPrisma } = await import('../server/prisma.ts');
  const prisma = getPrisma();
  if (!prisma) throw new Error('DATABASE_URL is not configured');
  const organization = await prisma.organization.findUnique({ where: { slug: 'promised-land-christian-center' } });
  if (!organization) throw new Error('Church organization was not found');

  const album = await prisma.album.findFirst({
    where: { organizationId: organization.id, slug: { startsWith: 'from-our-archive' } },
    select: { id: true, status: true },
  });
  if (!album) throw new Error('Archive album was not found');
  if (album.status !== 'DRAFT') throw new Error('Archive album is no longer a draft');

  let moved = 0;
  for (const item of localFiles) {
    const folder = item.folder || `plcc/gallery/${album.id}`;
    const uploaded = await uploadBytes(await readFile(path.join(root, item.file)), path.basename(item.file), folder);
    await confirmUrl(uploaded.url);
    if (item.storageKey.startsWith('local:leaders/')) {
      const name = item.storageKey.includes('pastor-grace') ? 'Pastor Grace Hiire' : 'Pastor Kennedy Hiire';
      const result = await prisma.leader.updateMany({
        where: { organizationId: organization.id, name, photoUrl: { startsWith: '/' } },
        data: { photoUrl: uploaded.url },
      });
      if (!result.count) throw new Error(`No local photo URL remained for ${name}`);
    } else {
      const result = await prisma.photo.updateMany({
        where: { albumId: album.id, storageKey: item.storageKey },
        data: { url: uploaded.url, storageKey: uploaded.storageKey, width: uploaded.width, height: uploaded.height },
      });
      if (!result.count) throw new Error(`No local archive photo matched ${path.basename(item.file)}`);
    }
    moved += 1;
  }

  const remaining = await prisma.photo.count({ where: { albumId: album.id, storageKey: { startsWith: 'local:' } } });
  const leaders = await prisma.leader.count({
    where: { organizationId: organization.id, name: { in: ['Pastor Grace Hiire', 'Pastor Kennedy Hiire'] }, photoUrl: { startsWith: '/' } },
  });
  if (remaining || leaders) throw new Error('Some image URLs are still local');

  for (const item of localFiles) {
    const relative = item.file.replace(/^public\//, '');
    rmSync(path.join(root, 'public', relative), { force: true });
    rmSync(path.join(root, 'site/public', relative), { force: true });
  }

  const secret = process.env.REVALIDATE_SECRET;
  if (secret) {
    for (const tag of ['leaders', 'albums']) {
      const response = await fetch('http://127.0.0.1:3002/api/revalidate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ secret, tag }),
      });
      if (!response.ok) console.log(`revalidate ${tag} ${response.status}`);
    }
  }

  console.log(`moved ${moved} images; album remains ${album.status}`);
  await prisma.$disconnect();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'Image move failed';
  console.error(message.includes('api_key') || message.includes('api_secret') ? 'Cloudinary request failed' : message);
  process.exitCode = 1;
});
