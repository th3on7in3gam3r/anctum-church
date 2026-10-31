import { CmsNotFound, DatabaseUnavailable, SanctumError } from '../../shared/errors.ts';
import {
  albumSlugBase,
  assertCoverBelongs,
  assertPublishable,
  isPublicPhoto,
  nextAlbumSlug,
  planGalleryMove,
} from '../../shared/gallery.ts';
import { revalidateSite } from '../cms/revalidateSite.ts';
import { notifyGalleryReview } from '../gallery/reviewNotice.ts';
import { getPrisma } from '../prisma.ts';
import { deleteCloudinaryAssets } from '../storage/images.ts';

function prisma() {
  const client = getPrisma();
  if (!client) throw DatabaseUnavailable();
  return client;
}

function refreshGallery() {
  revalidateSite('albums');
  revalidateSite('videos');
}

async function audit(action: 'ALBUM_CREATED' | 'ALBUM_SUBMITTED' | 'ALBUM_PUBLISHED' | 'ALBUM_ARCHIVED' | 'PHOTO_CONSENT_CONFIRMED' | 'PHOTO_HIDDEN' | 'VIDEO_ADDED', organizationId: string, actorId: string, targetId: string) {
  await prisma().auditEvent.create({
    data: { organizationId, actorId, action, targetId, metadata: { model: 'Gallery' } },
  });
}

const photoSelect = {
  id: true,
  albumId: true,
  storageKey: true,
  url: true,
  width: true,
  height: true,
  blurDataUrl: true,
  alt: true,
  caption: true,
  sortOrder: true,
  isHidden: true,
  hasMinors: true,
  consentConfirmed: true,
  createdAt: true,
} as const;

function counts(photos: { isHidden: boolean; hasMinors: boolean; consentConfirmed: boolean }[]) {
  return {
    photoCount: photos.length,
    blockedMinors: photos.filter((photo) => photo.hasMinors && !photo.consentConfirmed).length,
    publicPhotoCount: photos.filter((photo) => isPublicPhoto(photo)).length,
  };
}

export const galleryRepository = {
  async listAlbums(organizationId: string) {
    const rows = await prisma().album.findMany({
      where: { organizationId },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      include: { photos: { select: photoSelect }, videos: { select: { id: true } }, coverPhoto: { select: photoSelect } },
    });
    return {
      reviewCount: rows.filter((row) => row.status === 'SUBMITTED').length,
      albums: rows.map((row) => ({
        ...row,
        ...counts(row.photos),
        videoCount: row.videos.length,
      })),
    };
  },

  async createAlbum(organizationId: string, actorId: string, input: {
    title: string;
    date: Date;
    category: 'SERVICE' | 'EVENT' | 'MINISTRY' | 'OTHER';
    description?: string | null;
    eventId?: string | null;
    sermonId?: string | null;
    groupId?: string | null;
  }) {
    const client = prisma();
    const base = albumSlugBase(input.title, input.date);
    const existing = await client.album.findMany({
      where: { organizationId, slug: { startsWith: base } },
      select: { slug: true },
    });
    const album = await client.album.create({
      data: {
        organizationId,
        title: input.title.trim(),
        slug: nextAlbumSlug(base, existing.map((row) => row.slug)),
        category: input.category,
        date: input.date,
        description: input.description?.trim() || null,
        eventId: input.eventId || null,
        sermonId: input.sermonId || null,
        groupId: input.groupId || null,
        createdById: actorId,
      },
    });
    await audit('ALBUM_CREATED', organizationId, actorId, album.id);
    return album;
  },

  async albumInOrg(organizationId: string, id: string) {
    return prisma().album.findFirst({
      where: { id, organizationId },
      include: { photos: { orderBy: { sortOrder: 'asc' }, select: photoSelect }, videos: true, coverPhoto: { select: photoSelect } },
    });
  },

  async updateAlbum(organizationId: string, id: string, input: {
    title?: string;
    description?: string | null;
    category?: 'SERVICE' | 'EVENT' | 'MINISTRY' | 'OTHER';
    date?: Date;
    eventId?: string | null;
    sermonId?: string | null;
    groupId?: string | null;
    isFeatured?: boolean;
    coverPhotoId?: string | null;
  }) {
    const current = await this.albumInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    if (input.coverPhotoId) {
      const photo = current.photos.find((item) => item.id === input.coverPhotoId) || null;
      assertCoverBelongs(photo, current.id);
    }
    const album = await prisma().album.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.category ? { category: input.category } : {}),
        ...(input.date ? { date: input.date } : {}),
        ...(input.eventId !== undefined ? { eventId: input.eventId } : {}),
        ...(input.sermonId !== undefined ? { sermonId: input.sermonId } : {}),
        ...(input.groupId !== undefined ? { groupId: input.groupId } : {}),
        ...(input.isFeatured !== undefined ? { isFeatured: input.isFeatured } : {}),
        ...(input.coverPhotoId !== undefined ? { coverPhotoId: input.coverPhotoId } : {}),
      },
    });
    refreshGallery();
    return album;
  },

  async addPhoto(organizationId: string, actorId: string, albumId: string, input: {
    storageKey: string;
    url: string;
    width: number;
    height: number;
    blurDataUrl?: string | null;
    alt: string;
    caption?: string | null;
    hasMinors?: boolean;
  }) {
    const album = await this.albumInOrg(organizationId, albumId);
    if (!album) throw CmsNotFound();
    const photo = await prisma().photo.create({
      data: {
        albumId,
        storageKey: input.storageKey,
        url: input.url,
        width: input.width,
        height: input.height,
        blurDataUrl: input.blurDataUrl || null,
        alt: input.alt.trim() || `Photo from ${album.title}`,
        caption: input.caption?.trim() || null,
        hasMinors: Boolean(input.hasMinors),
        sortOrder: album.photos.length,
        uploadedById: actorId,
      },
    });
    refreshGallery();
    return photo;
  },

  async updatePhoto(organizationId: string, albumId: string, photoId: string, input: {
    alt?: string;
    caption?: string | null;
    hasMinors?: boolean;
    isHidden?: boolean;
    sortOrder?: number;
  }, actorId: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    const photo = album?.photos.find((item) => item.id === photoId);
    if (!album || !photo) throw CmsNotFound();
    const updated = await prisma().photo.update({
      where: { id: photoId },
      data: {
        ...(input.alt !== undefined ? { alt: input.alt } : {}),
        ...(input.caption !== undefined ? { caption: input.caption } : {}),
        ...(input.hasMinors !== undefined ? { hasMinors: input.hasMinors, ...(input.hasMinors ? {} : { consentConfirmed: false, consentConfirmedAt: null, consentConfirmedById: null }) } : {}),
        ...(input.isHidden !== undefined ? { isHidden: input.isHidden } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
    });
    if (input.isHidden) await audit('PHOTO_HIDDEN', organizationId, actorId, photoId);
    refreshGallery();
    return updated;
  },

  async reorderPhotos(organizationId: string, albumId: string, photoIds: string[]) {
    const album = await this.albumInOrg(organizationId, albumId);
    if (!album) throw CmsNotFound();
    const known = new Set(album.photos.map((photo) => photo.id));
    if (photoIds.length !== known.size || photoIds.some((id) => !known.has(id))) {
      throw new SanctumError('VALIDATION_ERROR', 'Reorder the photos that are already in this album.', 400);
    }
    await prisma().$transaction(photoIds.map((id, sortOrder) => prisma().photo.update({ where: { id }, data: { sortOrder } })));
    refreshGallery();
  },

  async deletePhoto(organizationId: string, albumId: string, photoId: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    const photo = album?.photos.find((item) => item.id === photoId);
    if (!album || !photo) throw CmsNotFound();
    if (album.coverPhotoId === photoId) {
      await prisma().album.update({ where: { id: albumId }, data: { coverPhotoId: null } });
    }
    await prisma().photo.delete({ where: { id: photoId } });
    await deleteCloudinaryAssets([photo.storageKey]);
    refreshGallery();
  },

  async deleteAlbum(organizationId: string, albumId: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    if (!album) throw CmsNotFound();
    const keys = album.photos.map((photo) => photo.storageKey);
    await prisma().album.update({ where: { id: albumId }, data: { coverPhotoId: null } });
    await prisma().album.delete({ where: { id: albumId } });
    await deleteCloudinaryAssets(keys);
    refreshGallery();
  },

  async submitAlbum(organizationId: string, actorId: string, albumId: string, reviewUrl: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    if (!album) throw CmsNotFound();
    if (album.status !== 'DRAFT') throw new SanctumError('VALIDATION_ERROR', 'Only a draft album can be submitted.', 400);
    const updated = await prisma().album.update({
      where: { id: albumId },
      data: { status: 'SUBMITTED', submittedAt: new Date() },
    });
    await audit('ALBUM_SUBMITTED', organizationId, actorId, albumId);
    const owners = await prisma().organizationMembership.findMany({
      where: { organizationId, status: 'ACTIVE', role: { in: ['OWNER', 'ADMIN'] } },
      include: { user: { select: { email: true } } },
    });
    await notifyGalleryReview({
      albumTitle: album.title,
      reviewUrl,
      emails: owners.map((row) => row.user.email),
    });
    return updated;
  },

  async publishAlbum(organizationId: string, actorId: string, albumId: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    if (!album) throw CmsNotFound();
    if (album.status !== 'DRAFT' && album.status !== 'SUBMITTED') {
      throw new SanctumError('VALIDATION_ERROR', 'This album is not ready to publish.', 400);
    }
    assertPublishable(album.photos);
    const updated = await prisma().album.update({
      where: { id: albumId },
      data: { status: 'PUBLISHED', publishedAt: new Date(), publishedById: actorId },
    });
    await audit('ALBUM_PUBLISHED', organizationId, actorId, albumId);
    refreshGallery();
    return updated;
  },

  async archiveAlbum(organizationId: string, actorId: string, albumId: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    if (!album) throw CmsNotFound();
    if (album.status !== 'PUBLISHED') throw new SanctumError('VALIDATION_ERROR', 'Only a published album can be archived.', 400);
    const updated = await prisma().album.update({ where: { id: albumId }, data: { status: 'ARCHIVED' } });
    await audit('ALBUM_ARCHIVED', organizationId, actorId, albumId);
    refreshGallery();
    return updated;
  },

  async confirmConsent(organizationId: string, actorId: string, albumId: string, photoId: string) {
    const album = await this.albumInOrg(organizationId, albumId);
    const photo = album?.photos.find((item) => item.id === photoId);
    if (!album || !photo) throw CmsNotFound();
    const updated = await prisma().photo.update({
      where: { id: photoId },
      data: { consentConfirmed: true, consentConfirmedAt: new Date(), consentConfirmedById: actorId },
    });
    await audit('PHOTO_CONSENT_CONFIRMED', organizationId, actorId, photoId);
    refreshGallery();
    return updated;
  },

  async addVideo(organizationId: string, actorId: string, input: {
    albumId?: string | null;
    provider: 'YOUTUBE' | 'TIKTOK';
    externalId: string;
    title: string;
    thumbnailUrl: string;
    orientation: 'LANDSCAPE' | 'VERTICAL';
    isPublished?: boolean;
  }) {
    if (input.albumId) {
      const album = await this.albumInOrg(organizationId, input.albumId);
      if (!album) throw CmsNotFound();
    }
    try {
      const video = await prisma().video.create({
        data: {
          organizationId,
          albumId: input.albumId || null,
          provider: input.provider,
          externalId: input.externalId,
          title: input.title,
          thumbnailUrl: input.thumbnailUrl,
          orientation: input.orientation,
          isPublished: Boolean(input.isPublished),
        },
      });
      await audit('VIDEO_ADDED', organizationId, actorId, video.id);
      refreshGallery();
      return video;
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002') {
        throw new SanctumError('VALIDATION_ERROR', 'That video is already in the gallery.', 409);
      }
      throw error;
    }
  },

  async moveSermonToGallery(organizationId: string, actorId: string, sermonId: string, mode: 'send' | 'move') {
    const sermon = await prisma().sermon.findFirst({ where: { id: sermonId, organizationId } });
    if (!sermon) throw CmsNotFound();
    if (mode === 'send' && sermon.status === 'PUBLISHED') {
      throw new SanctumError('VALIDATION_ERROR', 'Use Move to Gallery for a message that is already on the site.', 400);
    }
    if (mode === 'move' && sermon.status !== 'PUBLISHED') {
      throw new SanctumError('VALIDATION_ERROR', 'Move to Gallery is for a published item that is not a sermon.', 400);
    }
    const planned = planGalleryMove(sermon);
    const video = await this.addVideo(organizationId, actorId, planned);
    await prisma().ignoredVideo.upsert({
      where: { organizationId_youtubeVideoId: { organizationId, youtubeVideoId: planned.externalId } },
      update: { title: sermon.title },
      create: { organizationId, youtubeVideoId: planned.externalId, title: sermon.title },
    });
    await prisma().sermon.delete({ where: { id: sermonId } });
    revalidateSite('sermons');
    return video;
  },

  async publicAlbums(organizationId: string, input: { category?: string; page: number; eventId?: string; sermonId?: string }) {
    const pageSize = 12;
    const where = {
      organizationId,
      status: 'PUBLISHED' as const,
      ...(input.category && input.category !== 'VIDEOS' ? { category: input.category as 'SERVICE' | 'EVENT' | 'MINISTRY' | 'OTHER' } : {}),
      ...(input.eventId ? { eventId: input.eventId } : {}),
      ...(input.sermonId ? { sermonId: input.sermonId } : {}),
    };
    const rows = await prisma().album.findMany({
      where,
      orderBy: [{ date: 'desc' }],
      skip: Math.max(0, input.page - 1) * pageSize,
      take: pageSize + 1,
      include: {
        photos: { orderBy: { sortOrder: 'asc' }, select: photoSelect },
        videos: { where: { isPublished: true } },
        coverPhoto: { select: photoSelect },
        event: { select: { id: true, title: true } },
        sermon: { select: { id: true, title: true } },
      },
    });
    const hasMore = rows.length > pageSize;
    const pageRows = rows.slice(0, pageSize);
    return {
      hasMore,
      albums: pageRows.map((row) => {
        const visible = row.photos.filter((photo) => isPublicPhoto(photo));
        const cover = row.coverPhoto && isPublicPhoto(row.coverPhoto) ? row.coverPhoto : visible[0] || null;
        return {
          id: row.id,
          title: row.title,
          slug: row.slug,
          category: row.category,
          date: row.date,
          description: row.description,
          isFeatured: row.isFeatured,
          event: row.event,
          sermon: row.sermon,
          photoCount: visible.length,
          videoCount: row.videos.length,
          cover,
          thumbs: visible.filter((photo) => photo.id !== cover?.id).slice(0, 2),
        };
      }),
    };
  },

  async publicAlbum(organizationId: string, slug: string) {
    const row = await prisma().album.findFirst({
      where: { organizationId, slug, status: 'PUBLISHED' },
      include: {
        photos: { orderBy: { sortOrder: 'asc' }, select: photoSelect },
        videos: { where: { isPublished: true }, orderBy: { sortOrder: 'asc' } },
        event: { select: { id: true, title: true } },
        sermon: { select: { id: true, title: true } },
        coverPhoto: { select: photoSelect },
      },
    });
    if (!row) return null;
    const photos = row.photos.filter((photo) => isPublicPhoto(photo));
    const cover = row.coverPhoto && isPublicPhoto(row.coverPhoto) ? row.coverPhoto : photos[0] || null;
    return { ...row, photos, videos: row.videos, cover };
  },

  async publicVideos(organizationId: string, page: number) {
    const pageSize = 12;
    const rows = await prisma().video.findMany({
      where: { organizationId, isPublished: true },
      orderBy: { createdAt: 'desc' },
      skip: Math.max(0, page - 1) * pageSize,
      take: pageSize + 1,
    });
    return { hasMore: rows.length > pageSize, videos: rows.slice(0, pageSize) };
  },

  async recentMoments(organizationId: string) {
    const photos = await prisma().photo.findMany({
      where: {
        album: { organizationId, status: 'PUBLISHED' },
        isHidden: false,
        NOT: { hasMinors: true, consentConfirmed: false },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
      select: { ...photoSelect, album: { select: { slug: true, title: true } } },
    });
    return photos;
  },
};
