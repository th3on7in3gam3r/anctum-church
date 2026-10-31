import { SanctumError } from './errors.ts';
import { hqThumbnail, youtubeId } from './youtube.ts';

export const GALLERY_MAX_BYTES = 15 * 1024 * 1024;
export const GALLERY_FORMATS = ['jpg', 'png', 'webp', 'heic'] as const;
export type GalleryFormat = (typeof GALLERY_FORMATS)[number];

export type PhotoVisibility = {
  isHidden: boolean;
  hasMinors: boolean;
  consentConfirmed: boolean;
  alt?: string;
  albumId?: string;
  id?: string;
};

export function isPublicPhoto(photo: PhotoVisibility) {
  if (photo.isHidden) return false;
  if (photo.hasMinors && !photo.consentConfirmed) return false;
  return true;
}

export function photosMissingAlt(photos: PhotoVisibility[]) {
  return photos.filter((photo) => isPublicPhoto(photo) && !String(photo.alt || '').trim());
}

export function assertPublishable(photos: PhotoVisibility[]) {
  const missing = photosMissingAlt(photos);
  if (missing.length) {
    throw new SanctumError('VALIDATION_ERROR', 'Every visible photo needs a description before this album can be published.', 400);
  }
}

export function assertCoverBelongs(photo: { id: string; albumId: string } | null, albumId: string) {
  if (!photo || photo.albumId !== albumId) {
    throw new SanctumError('VALIDATION_ERROR', 'Choose a cover photo from this album.', 400);
  }
}

export function albumSlugBase(title: string, date: Date) {
  const day = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const stem = title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'album';
  return `${stem}-${day}`;
}

export function nextAlbumSlug(base: string, taken: string[]) {
  if (!taken.includes(base)) return base;
  let suffix = 2;
  while (taken.includes(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function galleryFolder(albumId: string) {
  return `plcc/gallery/${albumId}`;
}

export function cloudinaryUploadParams(albumId: string, timestamp: number) {
  return {
    timestamp,
    folder: galleryFolder(albumId),
    allowed_formats: GALLERY_FORMATS.join(','),
    max_file_size: GALLERY_MAX_BYTES,
  };
}

export function signCloudinaryParams(params: Record<string, string | number>, apiSecret: string) {
  const serialized = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&');
  return serialized + apiSecret;
}

export function assertUploadAllowed(input: { albumId: string; folder: string; format: string; bytes: number }) {
  if (input.folder !== galleryFolder(input.albumId)) {
    throw new SanctumError('VALIDATION_ERROR', 'That photo was uploaded to the wrong album folder.', 400);
  }
  const format = input.format.toLowerCase();
  if (!GALLERY_FORMATS.includes(format as GalleryFormat)) {
    throw new SanctumError('VALIDATION_ERROR', 'Photos must be JPG, PNG, WebP, or HEIC.', 400);
  }
  if (!Number.isFinite(input.bytes) || input.bytes < 1 || input.bytes > GALLERY_MAX_BYTES) {
    throw new SanctumError('VALIDATION_ERROR', 'Each photo must be 15 MB or smaller.', 400);
  }
}

const TIKTOK_HOSTS = new Set(['tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com']);

export function tiktokId(url: string | null | undefined) {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!TIKTOK_HOSTS.has(parsed.hostname)) return null;
    const match = parsed.pathname.match(/\/video\/(\d+)/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

export function parseVideoUrl(url: string): { provider: 'YOUTUBE' | 'TIKTOK'; externalId: string } | null {
  const youtube = youtubeId(url);
  if (youtube) return { provider: 'YOUTUBE', externalId: youtube };
  const tiktok = tiktokId(url);
  if (tiktok) return { provider: 'TIKTOK', externalId: tiktok };
  return null;
}

export type GalleryMove = {
  provider: 'YOUTUBE';
  externalId: string;
  title: string;
  thumbnailUrl: string;
  orientation: 'LANDSCAPE';
  isPublished: true;
};

export function planGalleryMove(sermon: {
  title: string;
  youtubeVideoId: string | null;
  thumbnailUrl?: string | null;
}): GalleryMove {
  if (!sermon.youtubeVideoId) {
    throw new SanctumError('VALIDATION_ERROR', 'Only a YouTube video can move to the gallery.', 400);
  }
  return {
    provider: 'YOUTUBE',
    externalId: sermon.youtubeVideoId,
    title: sermon.title,
    thumbnailUrl: sermon.thumbnailUrl || hqThumbnail(sermon.youtubeVideoId),
    orientation: 'LANDSCAPE',
    isPublished: true,
  };
}

export type GalleryStore = {
  videos: GalleryMove[];
  ignored: string[];
  sermons: { id: string; youtubeVideoId: string | null }[];
};

export function applyGalleryMove(store: GalleryStore, sermonId: string, sermon: {
  title: string;
  youtubeVideoId: string | null;
  thumbnailUrl?: string | null;
}) {
  const move = planGalleryMove(sermon);
  if (store.videos.some((video) => video.provider === move.provider && video.externalId === move.externalId)) {
    throw new SanctumError('VALIDATION_ERROR', 'That video is already in the gallery.', 409);
  }
  store.videos.push(move);
  if (!store.ignored.includes(move.externalId)) store.ignored.push(move.externalId);
  store.sermons = store.sermons.filter((row) => row.id !== sermonId);
  return move;
}

export type UploadJob = {
  id: string;
  albumId: string;
  name: string;
  status: 'queued' | 'uploading' | 'failed' | 'done';
  attempts: number;
};

export type UploadStore = {
  load(): Promise<UploadJob[]>;
  save(jobs: UploadJob[]): Promise<void>;
};

export function createUploadQueue(store: UploadStore, upload: (job: UploadJob) => Promise<void>) {
  let jobs: UploadJob[] = [];

  async function persist() {
    await store.save(jobs);
  }

  return {
    async resume() {
      jobs = await store.load();
      for (const job of jobs) {
        if (job.status === 'uploading') job.status = 'queued';
      }
      await persist();
    },
    async enqueue(job: Omit<UploadJob, 'status' | 'attempts'>) {
      jobs.push({ ...job, status: 'queued', attempts: 0 });
      await persist();
    },
    list() {
      return jobs;
    },
    async tick() {
      const next = jobs.find((job) => job.status === 'queued' || job.status === 'failed');
      if (!next) return;
      next.status = 'uploading';
      next.attempts += 1;
      await persist();
      try {
        await upload(next);
        next.status = 'done';
      } catch {
        next.status = 'failed';
      }
      await persist();
    },
  };
}
