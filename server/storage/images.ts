import { createHash } from 'node:crypto';
import { SanctumError } from '../../shared/errors.ts';
import { assertUploadAllowed, cloudinaryUploadParams, galleryFolder } from '../../shared/gallery.ts';

function credentials() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new SanctumError(
      'VALIDATION_ERROR',
      'Photo uploads need Cloudinary. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.',
      400
    );
  }
  return { cloudName, apiKey, apiSecret };
}

function sign(params: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return createHash('sha1').update(serialized + apiSecret).digest('hex');
}

export function createUploadSignature(albumId: string, now = Date.now()) {
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(now / 1000);
  const params = cloudinaryUploadParams(albumId, timestamp);
  return {
    cloudName,
    apiKey,
    timestamp,
    signature: sign(params, apiSecret),
    folder: params.folder,
    allowedFormats: params.allowed_formats,
    maxFileSize: params.max_file_size,
    uploadUrl: `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
  };
}

export async function deleteCloudinaryAssets(publicIds: string[]) {
  const ids = publicIds.map((id) => id.trim()).filter((id) => id && !id.startsWith('local:'));
  if (!ids.length) return;
  const { cloudName, apiKey, apiSecret } = credentials();
  const timestamp = Math.floor(Date.now() / 1000);
  await Promise.all(ids.map(async (publicId) => {
    const signature = sign({ public_id: publicId, timestamp }, apiSecret);
    const body = new URLSearchParams({
      public_id: publicId,
      timestamp: String(timestamp),
      api_key: apiKey,
      signature,
    });
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, {
      method: 'POST',
      body,
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) {
      throw new SanctumError('VALIDATION_ERROR', 'The photo could not be removed from storage.', 502);
    }
  }));
}

export function acceptCompletedUpload(input: { albumId: string; folder: string; format: string; bytes: number }) {
  assertUploadAllowed(input);
  if (!input.folder.startsWith(galleryFolder(input.albumId))) {
    throw new SanctumError('VALIDATION_ERROR', 'That photo was uploaded to the wrong album folder.', 400);
  }
}
