import type { Express, Request, Response } from 'express';
import { requireConsentConfirmer, requireGalleryEditor, requireGalleryPublisher } from '../../authz.ts';
import { resolveActorFromRequest } from '../../clerkAuth.ts';
import { requireOrganization } from '../../cms/access.ts';
import { SanctumError } from '../../../shared/errors.ts';
import { parseVideoUrl } from '../../../shared/gallery.ts';
import { sendError } from '../../http.ts';
import { galleryRepository } from '../../repositories/gallery.ts';
import { acceptCompletedUpload, createUploadSignature } from '../../storage/images.ts';
import { lookupYoutube } from '../../youtube/lookup.ts';

async function editor(req: Request) {
  const actor = await resolveActorFromRequest(req);
  requireOrganization(actor);
  requireGalleryEditor(actor);
  return actor;
}

function kampalaService(now = new Date()) {
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Kampala', weekday: 'long' }).format(now);
  const title = weekday === 'Sunday' ? 'Sunday worship' : weekday === 'Wednesday' ? 'Midweek prayer' : `${weekday} service`;
  const day = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  return { title, date: new Date(`${day}T12:00:00.000Z`), category: 'SERVICE' as const };
}

async function lookupEmbed(url: string) {
  const parsed = parseVideoUrl(url);
  if (!parsed) throw new SanctumError('VALIDATION_ERROR', 'Paste a YouTube or TikTok link.', 400);
  if (parsed.provider === 'YOUTUBE') {
    const video = await lookupYoutube(url);
    return { ...parsed, title: video.title, thumbnailUrl: video.thumbnailUrl };
  }
  let response: globalThis.Response;
  try {
    response = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`, { signal: AbortSignal.timeout(5000) });
  } catch {
    throw new SanctumError('VALIDATION_ERROR', 'TikTok could not be reached.', 400);
  }
  if (!response.ok) throw new SanctumError('VALIDATION_ERROR', 'That TikTok video is private, deleted, or not available.', 400);
  const body = await response.json() as { title?: string; thumbnail_url?: string };
  const title = body.title?.trim();
  if (!title || !body.thumbnail_url) throw new SanctumError('VALIDATION_ERROR', 'That TikTok video is private, deleted, or not available.', 400);
  return { ...parsed, title, thumbnailUrl: body.thumbnail_url };
}

export function registerGalleryRoutes(app: Express) {
  app.get('/api/cms/gallery/albums', async (req, res) => {
    try {
      const actor = await editor(req);
      res.json(await galleryRepository.listAlbums(actor.organizationId!));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums', async (req, res) => {
    try {
      const actor = await editor(req);
      const preset = req.body?.preset === 'service' ? kampalaService() : null;
      const title = preset?.title || String(req.body?.title || '').trim();
      const date = preset?.date || new Date(String(req.body?.date || ''));
      const category = preset?.category || req.body?.category;
      if (!title || Number.isNaN(date.getTime()) || !['SERVICE', 'EVENT', 'MINISTRY', 'OTHER'].includes(category)) {
        throw new SanctumError('VALIDATION_ERROR', 'An album needs a title, date, and category.', 400);
      }
      const links = actor.orgRole === 'MEDIA' ? {} : {
        eventId: typeof req.body?.eventId === 'string' ? req.body.eventId : null,
        sermonId: typeof req.body?.sermonId === 'string' ? req.body.sermonId : null,
        groupId: typeof req.body?.groupId === 'string' ? req.body.groupId : null,
      };
      const album = await galleryRepository.createAlbum(actor.organizationId!, actor.userId!, {
        title,
        date,
        category,
        description: typeof req.body?.description === 'string' ? req.body.description : null,
        ...links,
      });
      res.status(201).json({ album });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get('/api/cms/gallery/albums/:id', async (req, res) => {
    try {
      const actor = await editor(req);
      const album = await galleryRepository.albumInOrg(actor.organizationId!, req.params.id);
      if (!album) throw new SanctumError('CMS_NOT_FOUND', 'Album not found.', 404);
      res.json({ album });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.patch('/api/cms/gallery/albums/:id', async (req, res) => {
    try {
      const actor = await editor(req);
      const links = actor.orgRole === 'MEDIA' ? {} : {
        ...(req.body?.eventId !== undefined ? { eventId: req.body.eventId || null } : {}),
        ...(req.body?.sermonId !== undefined ? { sermonId: req.body.sermonId || null } : {}),
        ...(req.body?.groupId !== undefined ? { groupId: req.body.groupId || null } : {}),
      };
      const album = await galleryRepository.updateAlbum(actor.organizationId!, req.params.id, {
        ...(typeof req.body?.title === 'string' ? { title: req.body.title } : {}),
        ...(typeof req.body?.description === 'string' ? { description: req.body.description } : {}),
        ...(req.body?.category ? { category: req.body.category } : {}),
        ...(req.body?.date ? { date: new Date(req.body.date) } : {}),
        ...(req.body?.coverPhotoId !== undefined ? { coverPhotoId: req.body.coverPhotoId || null } : {}),
        ...(typeof req.body?.isFeatured === 'boolean' && actor.orgRole !== 'MEDIA' ? { isFeatured: req.body.isFeatured } : {}),
        ...links,
      });
      res.json({ album });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/submit', async (req, res) => {
    try {
      const actor = await editor(req);
      const album = await galleryRepository.submitAlbum(
        actor.organizationId!,
        actor.userId!,
        req.params.id,
        `${process.env.APP_URL || 'http://localhost:3000'}/dashboard/gallery/review`
      );
      res.json({ album });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/publish', async (req, res) => {
    try {
      const actor = await editor(req);
      requireGalleryPublisher(actor);
      const album = await galleryRepository.publishAlbum(actor.organizationId!, actor.userId!, req.params.id);
      res.json({ album });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/archive', async (req, res) => {
    try {
      const actor = await editor(req);
      requireGalleryPublisher(actor);
      const album = await galleryRepository.archiveAlbum(actor.organizationId!, actor.userId!, req.params.id);
      res.json({ album });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/cms/gallery/albums/:id', async (req, res) => {
    try {
      const actor = await editor(req);
      requireGalleryPublisher(actor);
      await galleryRepository.deleteAlbum(actor.organizationId!, req.params.id);
      res.json({ deleted: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/upload-signature', async (req, res) => {
    try {
      const actor = await editor(req);
      const album = await galleryRepository.albumInOrg(actor.organizationId!, req.params.id);
      if (!album) throw new SanctumError('CMS_NOT_FOUND', 'Album not found.', 404);
      res.json(createUploadSignature(album.id));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/photos', async (req, res) => {
    try {
      const actor = await editor(req);
      acceptCompletedUpload({
        albumId: req.params.id,
        folder: String(req.body?.folder || ''),
        format: String(req.body?.format || ''),
        bytes: Number(req.body?.bytes || 0),
      });
      const photo = await galleryRepository.addPhoto(actor.organizationId!, actor.userId!, req.params.id, {
        storageKey: String(req.body?.storageKey || ''),
        url: String(req.body?.url || ''),
        width: Number(req.body?.width || 0),
        height: Number(req.body?.height || 0),
        blurDataUrl: typeof req.body?.blurDataUrl === 'string' ? req.body.blurDataUrl : null,
        alt: typeof req.body?.alt === 'string' ? req.body.alt : '',
        caption: typeof req.body?.caption === 'string' ? req.body.caption : null,
        hasMinors: Boolean(req.body?.hasMinors),
      });
      res.status(201).json({ photo });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.patch('/api/cms/gallery/albums/:id/photos/:photoId', async (req, res) => {
    try {
      const actor = await editor(req);
      const photo = await galleryRepository.updatePhoto(actor.organizationId!, req.params.id, req.params.photoId, {
        ...(typeof req.body?.alt === 'string' ? { alt: req.body.alt } : {}),
        ...(req.body?.caption !== undefined ? { caption: req.body.caption || null } : {}),
        ...(typeof req.body?.hasMinors === 'boolean' ? { hasMinors: req.body.hasMinors } : {}),
        ...(typeof req.body?.isHidden === 'boolean' ? { isHidden: req.body.isHidden } : {}),
      }, actor.userId!);
      res.json({ photo });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/photos/reorder', async (req, res) => {
    try {
      const actor = await editor(req);
      const photoIds = Array.isArray(req.body?.photoIds) ? req.body.photoIds.map(String) : [];
      await galleryRepository.reorderPhotos(actor.organizationId!, req.params.id, photoIds);
      res.json({ ok: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.delete('/api/cms/gallery/albums/:id/photos/:photoId', async (req, res) => {
    try {
      const actor = await editor(req);
      await galleryRepository.deletePhoto(actor.organizationId!, req.params.id, req.params.photoId);
      res.json({ deleted: true });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/albums/:id/photos/:photoId/consent', async (req, res) => {
    try {
      const actor = await editor(req);
      requireConsentConfirmer(actor);
      const photo = await galleryRepository.confirmConsent(actor.organizationId!, actor.userId!, req.params.id, req.params.photoId);
      res.json({ photo });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/videos/lookup', async (req, res) => {
    try {
      await editor(req);
      res.json(await lookupEmbed(String(req.body?.url || '')));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/gallery/videos', async (req, res) => {
    try {
      const actor = await editor(req);
      const orientation = req.body?.orientation === 'VERTICAL' ? 'VERTICAL' : 'LANDSCAPE';
      const video = await galleryRepository.addVideo(actor.organizationId!, actor.userId!, {
        albumId: typeof req.body?.albumId === 'string' ? req.body.albumId : null,
        provider: req.body?.provider,
        externalId: String(req.body?.externalId || ''),
        title: String(req.body?.title || ''),
        thumbnailUrl: String(req.body?.thumbnailUrl || ''),
        orientation,
        isPublished: actor.orgRole !== 'MEDIA' && req.body?.isPublished !== false,
      });
      res.status(201).json({ video });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/sermons/:id/send-to-gallery', async (req: Request, res: Response) => {
    try {
      const actor = await editor(req);
      requireConsentConfirmer(actor);
      const video = await galleryRepository.moveSermonToGallery(actor.organizationId!, actor.userId!, req.params.id, 'send');
      res.json({ video });
    } catch (error) {
      sendError(res, error);
    }
  });

  app.post('/api/cms/sermons/:id/move-to-gallery', async (req: Request, res: Response) => {
    try {
      const actor = await editor(req);
      requireConsentConfirmer(actor);
      const video = await galleryRepository.moveSermonToGallery(actor.organizationId!, actor.userId!, req.params.id, 'move');
      res.json({ video });
    } catch (error) {
      sendError(res, error);
    }
  });
}
