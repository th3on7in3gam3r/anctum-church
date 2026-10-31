import { describe, expect, it } from 'vitest';
import { SanctumError } from '../shared/errors.ts';
import {
  albumSlugBase,
  applyGalleryMove,
  assertCoverBelongs,
  assertPublishable,
  cloudinaryUploadParams,
  createUploadQueue,
  isPublicPhoto,
  nextAlbumSlug,
  parseVideoUrl,
  photosMissingAlt,
  type UploadJob,
} from '../shared/gallery.ts';
import { canModerate, hasPermission, isClientMinister } from '../src/lib/permissions.ts';
import { requireCanStartSession, requireConsentConfirmer, requireGalleryPublisher, sessionRoleForJoin } from '../server/authz.ts';
import { deriveSessionRoleFromOrgRole, permissionsForRole, staffAreaAllowed } from '../shared/roles.ts';
import { selectNewUploads } from '../server/youtube/import.ts';

const media = { userId: 'media', organizationId: 'org', orgRole: 'MEDIA' as const, canPublishGallery: false };

describe('media stays out of the prayer room controls', () => {
  it('joins as a listener', () => {
    expect(deriveSessionRoleFromOrgRole('MEDIA')).toBe('LISTENER');
    expect(sessionRoleForJoin('MEDIA', 'HOST')).toBe('LISTENER');
    expect(isClientMinister('MEDIA')).toBe(false);
    expect(canModerate('MEDIA')).toBe(false);
  });

  it('rejects a session control for MEDIA', () => {
    expect(() => requireCanStartSession(media)).toThrow(SanctumError);
    try {
      requireCanStartSession(media);
    } catch (error) {
      expect(error).toMatchObject({ status: 403 });
    }
  });

  it('returns 403 for members, giving, sermons, and settings', () => {
    for (const area of ['members', 'giving', 'sermons', 'settings'] as const) {
      expect(staffAreaAllowed('MEDIA', area)).toBe(false);
    }
    expect(permissionsForRole('MEDIA')).toEqual([]);
  });

  it('gives unknown, missing, and lowercase roles no permissions', () => {
    expect(permissionsForRole(null)).toEqual([]);
    expect(permissionsForRole(undefined)).toEqual([]);
    expect(permissionsForRole('media')).toEqual([]);
    expect(permissionsForRole('owner')).toEqual([]);
    expect(staffAreaAllowed(null, 'rooms')).toBe(false);
    expect(staffAreaAllowed('media', 'sessions')).toBe(false);
    expect(deriveSessionRoleFromOrgRole(null)).toBe('LISTENER');
    expect(deriveSessionRoleFromOrgRole('media')).toBe('LISTENER');
    expect(deriveSessionRoleFromOrgRole(undefined)).toBe('LISTENER');
    expect(hasPermission(null, 'canManageRooms')).toBe(false);
    expect(hasPermission('owner', 'canManageSettings')).toBe(false);
    expect(canModerate(null)).toBe(false);
    expect(canModerate('media')).toBe(false);
    expect(isClientMinister('owner')).toBe(false);
    expect(isClientMinister(null)).toBe(false);
  });
});

describe('gallery publishing rules', () => {
  it('lets a publisher publish and stops media without the flag', () => {
    expect(requireGalleryPublisher({ ...media, orgRole: 'OWNER' }).valueOf()).toBe('OWNER');
    expect(() => requireGalleryPublisher(media)).toThrow(SanctumError);
    expect(() => requireGalleryPublisher({ ...media, canPublishGallery: true })).not.toThrow();
  });

  it('never lets media confirm consent', () => {
    expect(() => requireConsentConfirmer({ ...media, canPublishGallery: true })).toThrow(SanctumError);
    try {
      requireConsentConfirmer(media);
    } catch (error) {
      expect(error).toMatchObject({ status: 403 });
    }
  });

  it('hides drafts, hidden photos, and unconsented minor photos', () => {
    expect(isPublicPhoto({ isHidden: true, hasMinors: false, consentConfirmed: false })).toBe(false);
    expect(isPublicPhoto({ isHidden: false, hasMinors: true, consentConfirmed: false })).toBe(false);
    expect(isPublicPhoto({ isHidden: false, hasMinors: true, consentConfirmed: true })).toBe(true);
  });

  it('requires alt text on every visible photo', () => {
    const photos = [{ isHidden: false, hasMinors: false, consentConfirmed: false, alt: '' }];
    expect(photosMissingAlt(photos)).toHaveLength(1);
    expect(() => assertPublishable(photos)).toThrow(/description/);
    expect(() => assertPublishable([{ isHidden: false, hasMinors: false, consentConfirmed: false, alt: 'Photo from Sunday worship' }])).not.toThrow();
  });

  it('rejects a cover from another album', () => {
    expect(() => assertCoverBelongs({ id: 'p', albumId: 'other' }, 'album')).toThrow(/cover photo/);
    expect(() => assertCoverBelongs({ id: 'p', albumId: 'album' }, 'album')).not.toThrow();
  });
});

describe('album slugs and video links', () => {
  it('builds a dated slug and adds a numeric suffix on a clash', () => {
    const base = albumSlugBase('Sunday worship', new Date('2026-10-18T12:00:00.000Z'));
    expect(base).toBe('sunday-worship-2026-10-18');
    expect(nextAlbumSlug(base, [base, `${base}-2`])).toBe(`${base}-3`);
  });

  it('reads YouTube and TikTok links', () => {
    expect(parseVideoUrl('https://youtu.be/ZRZ7k2R679E')?.externalId).toBe('ZRZ7k2R679E');
    expect(parseVideoUrl('https://www.youtube.com/watch?v=_sYcvbeK6f8')?.provider).toBe('YOUTUBE');
    expect(parseVideoUrl('https://www.youtube.com/live/jfL3aFovzzQ')?.externalId).toBe('jfL3aFovzzQ');
    expect(parseVideoUrl('https://www.youtube.com/shorts/Y7xXUUMZJHg')?.externalId).toBe('Y7xXUUMZJHg');
    expect(parseVideoUrl('https://www.tiktok.com/@plcc/video/1234567890')).toEqual({ provider: 'TIKTOK', externalId: '1234567890' });
  });

  it('signs uploads into the album folder with a 15 MB cap', () => {
    expect(cloudinaryUploadParams('album1', 100)).toMatchObject({
      folder: 'plcc/gallery/album1',
      allowed_formats: 'jpg,png,webp,heic',
      max_file_size: 15 * 1024 * 1024,
    });
  });
});

describe('gallery upload queue', () => {
  it('resumes a photo after the network fails', async () => {
    let saved: UploadJob[] = [];
    let attempts = 0;
    const queue = createUploadQueue(
      {
        async load() { return saved; },
        async save(jobs) { saved = jobs.map((job) => ({ ...job })); },
      },
      async () => {
        attempts += 1;
        if (attempts === 1) throw new Error('offline');
      }
    );
    await queue.enqueue({ id: '1', albumId: 'album', name: 'sunday.webp' });
    await queue.tick();
    expect(saved[0]?.status).toBe('failed');
    const resumed = createUploadQueue(
      {
        async load() { return saved; },
        async save(jobs) { saved = jobs.map((job) => ({ ...job })); },
      },
      async () => {
        attempts += 1;
      }
    );
    await resumed.resume();
    await resumed.tick();
    expect(saved[0]?.status).toBe('done');
  });
});

describe('send to gallery', () => {
  it('creates one video and blocks the sermon import', () => {
    const store = {
      videos: [],
      ignored: [] as string[],
      sermons: [{ id: 'sermon', youtubeVideoId: 'ZRZ7k2R679E' }],
    };
    applyGalleryMove(store, 'sermon', { title: 'John Weds Anna', youtubeVideoId: 'ZRZ7k2R679E', thumbnailUrl: 'https://i.ytimg.com/vi/ZRZ7k2R679E/hqdefault.jpg' });
    expect(store.videos).toHaveLength(1);
    expect(store.sermons).toHaveLength(0);
    expect(selectNewUploads({
      entries: [{ videoId: 'ZRZ7k2R679E', title: 'John Weds Anna', publishedAt: '2026-06-06T00:00:00.000Z', url: 'https://youtu.be/ZRZ7k2R679E' }],
      existingVideoIds: [],
      ignoredVideoIds: store.ignored,
    })).toEqual([]);
    expect(() => applyGalleryMove({ ...store, sermons: [{ id: 'again', youtubeVideoId: 'ZRZ7k2R679E' }] }, 'again', {
      title: 'John Weds Anna',
      youtubeVideoId: 'ZRZ7k2R679E',
    })).toThrow(/already in the gallery/);
  });
});
