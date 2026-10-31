import { z } from 'zod';
import {
  announcementSchema,
  eventSchema,
  pageBodySchema,
  sermonSchema,
} from '@shared/validations/cms.ts';
import { publishedSermonRows } from '@shared/sermons.ts';
import { siteEnv } from './env';

const REVALIDATE_SECONDS = 300;

export const publicPageSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  body: pageBodySchema,
  heroImageUrl: z.string().nullable().optional(),
  isPublished: z.boolean(),
  sortOrder: z.number(),
});

export const publicAnnouncementSchema = announcementSchema.extend({
  id: z.string(),
});

export const publicEventSchema = eventSchema.extend({
  id: z.string(),
  prayerRoom: z.object({ slug: z.string(), name: z.string() }).nullable().optional(),
});

export const publicSermonSchema = sermonSchema.extend({
  id: z.string(),
});

export type PublicPage = z.infer<typeof publicPageSchema>;
export type PublicAnnouncement = z.infer<typeof publicAnnouncementSchema>;
export type PublicEvent = z.infer<typeof publicEventSchema>;
export type PublicSermon = z.infer<typeof publicSermonSchema>;

export type ContentTag = 'pages' | 'announcements' | 'events' | 'sermons' | 'leaders' | 'groups' | 'faqs' | 'albums' | 'videos';

function asIso(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return value;
}

function normalizeSermon(row: Record<string, unknown>) {
  const preached = asIso(row.preachedOn);
  return {
    ...row,
    preachedOn: typeof preached === 'string' ? preached.slice(0, 10) : preached,
    seriesName: row.seriesName ?? null,
    scripture: row.scripture ?? null,
    youtubeUrl: row.youtubeUrl ?? null,
    audioUrl: row.audioUrl ?? null,
    notes: row.notes ?? null,
  };
}

async function publicGet(path: string, tag: ContentTag): Promise<unknown> {
  const env = siteEnv();
  const url = `${env.apiUrl}/api/public/${env.orgSlug}${path}`;
  let response: Response | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      response = await fetch(url, { next: { revalidate: REVALIDATE_SECONDS, tags: [tag] } });
      if (response.ok || response.status === 404 || response.status < 500) break;
    } catch {
      response = null;
    }
  }
  if (!response) {
    if (process.env.CI && !process.env.VERCEL) return null;
    throw new Error('Church content is unavailable.');
  }
  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(`Church content is unavailable (${response.status}).`);
  }
  return response.json();
}

export async function listPages(): Promise<PublicPage[]> {
  const payload = await publicGet('/pages', 'pages');
  if (!payload) return [];
  return z.object({ pages: z.array(publicPageSchema) }).parse(payload).pages;
}

export async function getPage(slug: string): Promise<PublicPage | null> {
  const payload = await publicGet(`/pages/${encodeURIComponent(slug)}`, 'pages');
  if (!payload) return null;
  return z.object({ page: publicPageSchema }).parse(payload).page;
}

export async function listAnnouncements(): Promise<PublicAnnouncement[]> {
  const payload = await publicGet('/announcements', 'announcements');
  if (!payload) return [];
  const rows = z.object({ announcements: z.array(z.record(z.string(), z.unknown())) }).parse(payload).announcements;
  return rows.map((row) => publicAnnouncementSchema.parse({
    ...row,
    startsAt: asIso(row.startsAt),
    endsAt: row.endsAt == null || row.endsAt === '' ? null : asIso(row.endsAt),
  }));
}

export async function listEvents(): Promise<PublicEvent[]> {
  const payload = await publicGet('/events', 'events');
  if (!payload) return [];
  const rows = z.object({ events: z.array(z.record(z.string(), z.unknown())) }).parse(payload).events;
  return rows.map((row) => publicEventSchema.parse({
    ...row,
    startsAt: asIso(row.startsAt),
    endsAt: asIso(row.endsAt),
    imageUrl: row.imageUrl ?? null,
    description: row.description ?? '',
    prayerRoom: row.prayerRoom ?? null,
  }));
}

export async function getEvent(id: string): Promise<PublicEvent | null> {
  const events = await listEvents();
  return events.find((event) => event.id === id) ?? null;
}

export async function listSermons(): Promise<PublicSermon[]> {
  const payload = await publicGet('/sermons', 'sermons');
  if (!payload) return [];
  const rows = z.object({ sermons: z.array(z.record(z.string(), z.unknown())) }).parse(payload).sermons;
  return publishedSermonRows(rows).map((row) => publicSermonSchema.parse(normalizeSermon(row)));
}

export async function getSermon(id: string): Promise<PublicSermon | null> {
  const sermons = await listSermons();
  return sermons.find((sermon) => sermon.id === id) ?? null;
}

export const publicLiveRoomSchema = z.object({
  name: z.string(),
  slug: z.string(),
  kind: z.enum(['CORPORATE', 'HUDDLE']),
  groupName: z.string().nullable(),
  listenerCount: z.number(),
  status: z.enum(['LIVE', 'WAITING']),
});

export const publicLiveSchema = z.object({
  status: z.enum(['LIVE', 'NEXT']),
  name: z.string().nullable(),
  slug: z.string().nullable(),
  startsAt: z.string().nullable().optional(),
  rooms: z.array(publicLiveRoomSchema).default([]),
});

export type PublicLive = z.infer<typeof publicLiveSchema>;

export async function getLive(): Promise<PublicLive | null> {
  const env = siteEnv();
  try {
    const response = await fetch(`${env.apiUrl}/api/public/${env.orgSlug}/live`, {
      next: { revalidate: 15 },
    });
    if (!response.ok) return null;
    return publicLiveSchema.parse(await response.json());
  } catch {
    return null;
  }
}

export const publicLeaderSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string(),
  photoUrl: z.string().nullable().optional(),
  bio: z.string().nullable().optional(),
  sortOrder: z.number(),
});

export const publicGroupSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  publicDescription: z.string().nullable().optional(),
  meetingTime: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  sortOrder: z.number(),
  huddle: z.object({
    name: z.string(),
    slug: z.string(),
    status: z.enum(['LIVE', 'WAITING', 'SCHEDULED']),
    nextStartsAt: z.string().nullable(),
  }).nullable().optional(),
});

export const publicServiceTimeSchema = z.object({
  id: z.string(),
  name: z.string(),
  homeLabel: z.string().nullable(),
  cadence: z.string(),
  weekday: z.string().nullable(),
  opens: z.string(),
  closes: z.string(),
  startLabel: z.string(),
  endLabel: z.string(),
  place: z.string().nullable(),
  note: z.string().nullable(),
  showOnHome: z.boolean(),
  sortOrder: z.number(),
});

export const publicFaqSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
  sortOrder: z.number(),
});

export type PublicLeader = z.infer<typeof publicLeaderSchema>;
export type PublicGroup = z.infer<typeof publicGroupSchema>;
export type PublicFaq = z.infer<typeof publicFaqSchema>;
export type PublicServiceTime = z.infer<typeof publicServiceTimeSchema>;

async function publicList<T>(path: string, key: string, tag: ContentTag, schema: z.ZodType<T>): Promise<T[]> {
  const payload = await publicGet(path, tag);
  if (!payload) return [];
  const rows = z.object({ [key]: z.array(schema) }).parse(payload)[key];
  return rows ?? [];
}

export function listLeaders() {
  return publicList('/leaders', 'leaders', 'leaders', publicLeaderSchema);
}

export function listPublicGroups() {
  return publicList('/groups', 'groups', 'groups', publicGroupSchema);
}

export function listFaqs() {
  return publicList('/faqs', 'faqs', 'faqs', publicFaqSchema);
}

export function listServiceTimes() {
  return publicList('/service-times', 'serviceTimes', 'pages', publicServiceTimeSchema);
}

const galleryPhotoSchema = z.object({
  id: z.string(),
  url: z.string(),
  alt: z.string(),
  width: z.number(),
  height: z.number(),
  blurDataUrl: z.string().nullable().optional(),
  caption: z.string().nullable().optional(),
});

export const publicAlbumCardSchema = z.object({
  id: z.string(),
  title: z.string(),
  slug: z.string(),
  category: z.string(),
  date: z.string(),
  description: z.string().nullable().optional(),
  isFeatured: z.boolean(),
  photoCount: z.number(),
  videoCount: z.number(),
  cover: galleryPhotoSchema.nullable(),
  thumbs: z.array(galleryPhotoSchema),
  event: z.object({ id: z.string(), title: z.string() }).nullable().optional(),
  sermon: z.object({ id: z.string(), title: z.string() }).nullable().optional(),
});

const galleryVideoSchema = z.object({
  id: z.string(),
  provider: z.enum(['YOUTUBE', 'TIKTOK']),
  externalId: z.string(),
  title: z.string(),
  thumbnailUrl: z.string(),
  orientation: z.enum(['LANDSCAPE', 'VERTICAL']),
});

export type PublicAlbumCard = z.infer<typeof publicAlbumCardSchema>;
export type GalleryPhoto = z.infer<typeof galleryPhotoSchema>;
export type GalleryVideo = z.infer<typeof galleryVideoSchema>;

function asDateString(value: unknown) {
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString();
  return value;
}

export async function listPublicAlbums(query = '') {
  const payload = await publicGet(`/albums${query}`, 'albums');
  if (!payload || typeof payload !== 'object') return { albums: [] as PublicAlbumCard[], hasMore: false, moments: [] as Array<GalleryPhoto & { album?: { slug: string; title: string } }> };
  const body = payload as { albums?: unknown[]; hasMore?: boolean; moments?: unknown[] };
  const albums = z.array(publicAlbumCardSchema).parse((body.albums || []).map((row) => {
    const album = row as Record<string, unknown>;
    return { ...album, date: asDateString(album.date) };
  }));
  return { albums, hasMore: Boolean(body.hasMore), moments: (body.moments || []) as Array<GalleryPhoto & { album?: { slug: string; title: string } }> };
}

export async function getPublicAlbum(slug: string) {
  const payload = await publicGet(`/albums/${slug}`, 'albums');
  if (!payload || typeof payload !== 'object') return null;
  const album = (payload as { album?: Record<string, unknown> }).album;
  if (!album) return null;
  return {
    ...album,
    date: String(asDateString(album.date) || ''),
    photos: z.array(galleryPhotoSchema).parse(album.photos || []),
    videos: z.array(galleryVideoSchema).parse(album.videos || []),
    cover: album.cover ? galleryPhotoSchema.parse(album.cover) : null,
    event: album.event as { id: string; title: string } | null,
    sermon: album.sermon as { id: string; title: string } | null,
    title: String(album.title),
    description: typeof album.description === 'string' ? album.description : null,
  };
}

export async function listPublicVideos(page = 1) {
  const payload = await publicGet(`/videos?page=${page}`, 'videos');
  if (!payload || typeof payload !== 'object') return { videos: [] as GalleryVideo[], hasMore: false };
  const body = payload as { videos?: unknown[]; hasMore?: boolean };
  return { videos: z.array(galleryVideoSchema).parse(body.videos || []), hasMore: Boolean(body.hasMore) };
}
