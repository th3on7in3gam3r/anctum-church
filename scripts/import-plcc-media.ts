// Logo is owned by packages/brand. Imports never touch the logo.
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { albumSlugBase } from '../shared/gallery.ts';
import { applyPlccContent } from './applyPlccContent.ts';
import { getPrisma } from '../server/prisma.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = 'https://abigabasarah.github.io/PromisedLand-Christian-Center-website';
const cache = '/tmp/plcc-import';

const archivePhotos = [
  { file: 'images/1.jpg', alt: 'Archive photo from a Promised Land Christian Center gathering' },
  { file: 'images/index.jpg', alt: 'Archive photo from Promised Land Christian Center' },
  { file: 'images/6.jpg', alt: 'Archive photo from a Promised Land Christian Center service' },
  { file: 'images/3.jpg', alt: 'Archive photo from the Promised Land Christian Center community' },
];

async function download(file: string) {
  await mkdir(cache, { recursive: true });
  const target = path.join(cache, file.replace(/\//g, '__'));
  const response = await fetch(`${source}/${file.split('/').map(encodeURIComponent).join('/')}`, {
    headers: { 'user-agent': 'Mozilla/5.0' },
  });
  if (!response.ok) throw new Error(`${file} returned ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  await writeFile(target, bytes);
  return target;
}

function credentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) return null;
  return { cloudName, apiKey, apiSecret };
}

async function uploadImage(filePath: string, folder: string) {
  const creds = credentials();
  if (!creds) throw new Error('Cloudinary is not configured');
  const bytes = await readFile(filePath);
  const timestamp = Math.floor(Date.now() / 1000);
  const params = { folder, timestamp };
  const serialized = Object.keys(params).sort().map((key) => `${key}=${params[key as keyof typeof params]}`).join('&');
  const signature = createHash('sha1').update(serialized + creds.apiSecret).digest('hex');
  const body = new FormData();
  body.append('file', new Blob([bytes]), path.basename(filePath));
  body.append('api_key', creds.apiKey);
  body.append('timestamp', String(timestamp));
  body.append('folder', folder);
  body.append('signature', signature);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`, { method: 'POST', body });
  const payload = await response.json() as { secure_url?: string; public_id?: string; width?: number; height?: number; error?: { message?: string } };
  if (!response.ok || !payload.secure_url || !payload.public_id) return null;
  return { url: payload.secure_url, storageKey: payload.public_id, width: payload.width || 0, height: payload.height || 0 };
}

async function dimensions(filePath: string) {
  const { execFile } = await import('node:child_process');
  const { promisify } = await import('node:util');
  const output = await promisify(execFile)('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', filePath]);
  const width = Number(output.stdout.match(/pixelWidth: (\d+)/)?.[1] || 0);
  const height = Number(output.stdout.match(/pixelHeight: (\d+)/)?.[1] || 0);
  return { width, height };
}

async function publishLocal(filePath: string, publicPath: string) {
  const bytes = await readFile(filePath);
  for (const dir of [path.join(root, 'public'), path.join(root, 'site/public')]) {
    const destination = path.join(dir, publicPath);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
  const size = await dimensions(filePath);
  return { url: `/${publicPath}`, storageKey: `local:${publicPath}`, ...size };
}

async function storeImage(filePath: string, folder: string, publicPath: string) {
  const uploaded = await uploadImage(filePath, folder).catch(() => null);
  if (uploaded) return { ...uploaded, hosted: 'cloudinary' as const };
  return { ...(await publishLocal(filePath, publicPath)), hosted: 'local' as const };
}

async function main() {
  const prisma = getPrisma();
  if (!prisma) throw new Error('DATABASE_URL is not configured');
  const organization = await prisma.organization.findUnique({ where: { slug: 'promised-land-christian-center' } });
  if (!organization) throw new Error('Church organization was not found');
  await applyPlccContent(prisma, organization.id);

  const graceFile = await download('images/Pastor Grace.jpg');
  const kennedyFile = await download('images/Pastor.jpg');
  const grace = await storeImage(graceFile, 'plcc/leaders', 'leaders/pastor-grace.jpg');
  const kennedy = await storeImage(kennedyFile, 'plcc/leaders', 'leaders/pastor-kennedy.jpg');
  console.log(grace.hosted === 'cloudinary' ? 'pastor photos on cloudinary' : 'pastor photos stored locally; cloudinary rejected the configured key');
  await prisma.leader.updateMany({ where: { organizationId: organization.id, name: 'Pastor Grace Hiire' }, data: { photoUrl: grace.url } });
  await prisma.leader.updateMany({ where: { organizationId: organization.id, name: 'Pastor Kennedy Hiire' }, data: { photoUrl: kennedy.url } });

  const existing = await prisma.album.findFirst({ where: { organizationId: organization.id, slug: { startsWith: 'from-our-archive' } } });
  if (!existing) {
    const date = new Date('2026-10-15T00:00:00.000Z');
    const album = await prisma.album.create({
      data: {
        organizationId: organization.id,
        title: 'From our archive',
        slug: albumSlugBase('From our archive', date),
        category: 'OTHER',
        date,
        description: 'Photos brought across from the previous church website. Not published. Staff will review.',
        status: 'DRAFT',
      },
    });
    let coverId: string | null = null;
    for (const [index, photo] of archivePhotos.entries()) {
      const file = await download(photo.file);
      const uploaded = await storeImage(file, `plcc/gallery/${album.id}`, `archive/${path.basename(photo.file)}`);
      const row = await prisma.photo.create({
        data: {
          albumId: album.id,
          storageKey: uploaded.storageKey,
          url: uploaded.url,
          width: uploaded.width,
          height: uploaded.height,
          alt: photo.alt,
          sortOrder: index,
        },
      });
      if (!coverId) coverId = row.id;
    }
    if (coverId) await prisma.album.update({ where: { id: album.id }, data: { coverPhotoId: coverId } });
  }

  const sermon = await prisma.sermon.findFirst({
    where: { organizationId: organization.id, youtubeVideoId: 'loQt6FfHuEA' },
    select: { title: true, isPlaceholder: true },
  });
  console.log(sermon ? 'sermon present' : 'sermon missing');
  console.log('gallery files named gallery*.jpg were not on the website (404). Imported images/1.jpg, index.jpg, 6.jpg, and 3.jpg.');
  await prisma.$disconnect();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
