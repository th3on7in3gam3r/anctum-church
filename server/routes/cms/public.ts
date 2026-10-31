import type { Express, Request, Response } from 'express';
import { CmsNotFound, Unauthorized } from '../../../shared/errors.ts';
import { cmsValidationError, eventRsvpSchema, visitorCardSchema } from '../../../shared/validations/cms.ts';
import { assertPublicRateLimit } from '../../cms/rateLimit.ts';
import { publishedSermonRows } from '../../../shared/sermons.ts';
import { currentAnnouncements, publishedOnly, upcomingEvents } from '../../cms/publicContent.ts';
import { sendError } from '../../http.ts';
import { getPrisma } from '../../prisma.ts';
import { organizationRepository } from '../../repositories/index.ts';
import { cmsRepository } from '../../repositories/cms.ts';
import { galleryRepository } from '../../repositories/gallery.ts';
import { getNextOccurrences } from '../../../src/services/sessionScheduler.ts';
import type { PrayerRoom } from '../../../src/types/index.ts';
import { publicLiveRooms } from '../../../shared/huddle.ts';

const PUBLIC_CACHE = 'public, max-age=300';

function withoutPlaceholder<T extends { isPlaceholder: boolean }>(row: T) {
  const copy = { ...row };
  delete copy.isPlaceholder;
  return copy;
}

function clientKey(req: Request): string {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : req.ip || 'local';
  return `${ip}:${req.path}`;
}

async function organizationBySlug(slug: string) {
  const organization = await organizationRepository.findBySlug(slug);
  if (!organization) throw CmsNotFound('Church not found');
  return organization;
}

function honeypotFilled(body: unknown): boolean {
  return Boolean(body && typeof body === 'object' && 'company' in body && String((body as { company?: string }).company || '').trim());
}

async function listPages(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const pages = publishedOnly(await cmsRepository.listPages(organization.id)).map(withoutPlaceholder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ pages });
  } catch (error) {
    sendError(res, error);
  }
}

async function getPage(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const pages = publishedOnly(await cmsRepository.listPages(organization.id));
    const page = pages.find((item) => item.slug === req.params.slug);
    if (!page) throw CmsNotFound('Page not found');
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ page: withoutPlaceholder(page) });
  } catch (error) {
    sendError(res, error);
  }
}

async function listAnnouncements(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const announcements = currentAnnouncements(await cmsRepository.listAnnouncements(organization.id)).map(withoutPlaceholder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ announcements });
  } catch (error) {
    sendError(res, error);
  }
}

async function listLeaders(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const leaders = (await cmsRepository.listLeaders(organization.id)).map(withoutPlaceholder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ leaders });
  } catch (error) {
    sendError(res, error);
  }
}

async function huddlesByGroup(organizationId: string) {
  const prisma = getPrisma();
  if (!prisma) return new Map<string, { name: string; slug: string; status: 'LIVE' | 'WAITING' | 'SCHEDULED'; nextStartsAt: string | null }>();
  const rooms = await prisma.prayerRoom.findMany({
    where: { organizationId, kind: 'HUDDLE', groupId: { not: null } },
    select: {
      name: true,
      slug: true,
      groupId: true,
      isRecurring: true,
      recurrenceRule: true,
      selectedDays: true,
      oneTimeDate: true,
      scheduledStart: true,
      timezone: true,
      sessions: {
        where: { status: { in: ['LIVE', 'WAITING'] } },
        select: { status: true },
        orderBy: { updatedAt: 'desc' },
        take: 1,
      },
    },
  });
  const map = new Map<string, { name: string; slug: string; status: 'LIVE' | 'WAITING' | 'SCHEDULED'; nextStartsAt: string | null }>();
  for (const room of rooms) {
    if (!room.groupId || map.has(room.groupId)) continue;
    const open = room.sessions[0]?.status;
    const next = getNextOccurrences(room as unknown as PrayerRoom, 1)[0];
    map.set(room.groupId, {
      name: room.name,
      slug: room.slug,
      status: open === 'LIVE' || open === 'WAITING' ? open : 'SCHEDULED',
      nextStartsAt: next ? next.toISOString() : null,
    });
  }
  return map;
}

async function listPublicGroups(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const huddles = await huddlesByGroup(organization.id);
    const groups = (await cmsRepository.listGroups(organization.id))
      .filter((group) => group.showOnWebsite)
      .map((group) => ({
        id: group.id,
        name: group.name,
        type: group.type,
        publicDescription: group.publicDescription,
        meetingTime: group.meetingTime,
        imageUrl: group.imageUrl,
        sortOrder: group.sortOrder,
        huddle: huddles.get(group.id) ?? null,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ groups });
  } catch (error) {
    sendError(res, error);
  }
}

async function listFaqs(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const faqs = (await cmsRepository.listFaqs(organization.id)).map(withoutPlaceholder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ faqs });
  } catch (error) {
    sendError(res, error);
  }
}

async function listEvents(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const events = upcomingEvents(await cmsRepository.listEvents(organization.id)).map(withoutPlaceholder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ events });
  } catch (error) {
    sendError(res, error);
  }
}

async function listSermons(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const sermons = publishedSermonRows(await cmsRepository.listSermons(organization.id)).map(withoutPlaceholder);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ sermons });
  } catch (error) {
    sendError(res, error);
  }
}

async function createVisitor(req: Request, res: Response) {
  try {
    assertPublicRateLimit(clientKey(req));
    const parsed = visitorCardSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw cmsValidationError(parsed.error);
    if (honeypotFilled(req.body)) {
      res.status(201).json({ accepted: true });
      return;
    }
    const organization = await organizationBySlug(req.params.orgSlug);
    const visitor = await cmsRepository.createVisitor(organization.id, parsed.data);
    res.status(201).json({ visitor });
  } catch (error) {
    sendError(res, error);
  }
}

async function createRsvp(req: Request, res: Response) {
  try {
    assertPublicRateLimit(clientKey(req));
    const parsed = eventRsvpSchema.safeParse(req.body ?? {});
    if (!parsed.success) throw cmsValidationError(parsed.error);
    if (honeypotFilled(req.body)) {
      res.status(201).json({ accepted: true });
      return;
    }
    const organization = await organizationBySlug(req.params.orgSlug);
    const event = await cmsRepository.eventInOrg(organization.id, req.params.eventId);
    if (!event) throw CmsNotFound('Event not found');
    if (!event.rsvpEnabled) throw Unauthorized('RSVP is not open for this event.');
    const rsvp = await cmsRepository.createRsvp(event.id, parsed.data);
    res.status(201).json({ rsvp });
  } catch (error) {
    sendError(res, error);
  }
}

async function liveStatus(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const prisma = getPrisma();
    res.setHeader('Cache-Control', 'public, max-age=15');
    if (!prisma) {
      res.json({ status: 'NEXT', name: null, slug: null, startsAt: null, rooms: [] });
      return;
    }
    const openSessions = await prisma.prayerSession.findMany({
      where: { status: { in: ['LIVE', 'WAITING'] }, prayerRoom: { organizationId: organization.id } },
      orderBy: { updatedAt: 'desc' },
      select: {
        status: true,
        prayerRoom: { select: { name: true, slug: true, kind: true, group: { select: { name: true } } } },
        _count: { select: { participants: { where: { leftAt: null, role: 'LISTENER' } } } },
      },
    });
    const rooms = publicLiveRooms(
      openSessions.map((session) => ({
        name: session.prayerRoom.name,
        slug: session.prayerRoom.slug,
        kind: session.prayerRoom.kind,
        groupName: session.prayerRoom.group?.name ?? null,
        listenerCount: session._count.participants,
        status: session.status,
      }))
    );
    const live = openSessions.find((session) => session.status === 'LIVE');
    if (live) {
      res.json({ status: 'LIVE', name: live.prayerRoom.name, slug: live.prayerRoom.slug, startsAt: null, rooms });
      return;
    }
    const scheduledRooms = await prisma.prayerRoom.findMany({
      where: { organizationId: organization.id },
      select: {
        name: true,
        slug: true,
        isRecurring: true,
        recurrenceRule: true,
        selectedDays: true,
        oneTimeDate: true,
        scheduledStart: true,
        timezone: true,
      },
    });
    let next: { name: string; slug: string; startsAt: string } | null = null;
    for (const room of scheduledRooms) {
      const occurrence = getNextOccurrences(room as unknown as PrayerRoom, 1)[0];
      if (!occurrence) continue;
      if (!next || occurrence.toISOString() < next.startsAt) {
        next = { name: room.name, slug: room.slug, startsAt: occurrence.toISOString() };
      }
    }
    const waiting = rooms.find((room) => room.status === 'WAITING');
    res.json({
      status: 'NEXT',
      name: waiting?.name ?? next?.name ?? scheduledRooms[0]?.name ?? null,
      slug: waiting?.slug ?? next?.slug ?? scheduledRooms[0]?.slug ?? null,
      startsAt: waiting ? null : next?.startsAt ?? null,
      rooms,
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function listAlbums(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    const category = typeof req.query.category === 'string' ? req.query.category : undefined;
    const payload = await galleryRepository.publicAlbums(organization.id, {
      category: category && category !== 'ALL' ? category : undefined,
      page,
      eventId: typeof req.query.eventId === 'string' ? req.query.eventId : undefined,
      sermonId: typeof req.query.sermonId === 'string' ? req.query.sermonId : undefined,
    });
    const moments = page === 1 ? await galleryRepository.recentMoments(organization.id) : [];
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ ...payload, moments });
  } catch (error) {
    sendError(res, error);
  }
}

async function getAlbum(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const album = await galleryRepository.publicAlbum(organization.id, req.params.slug);
    if (!album) throw CmsNotFound('Album not found');
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({ album });
  } catch (error) {
    sendError(res, error);
  }
}

async function listVideos(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const page = Math.max(1, Number(req.query.page || 1) || 1);
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json(await galleryRepository.publicVideos(organization.id, page));
  } catch (error) {
    sendError(res, error);
  }
}

async function listServiceTimes(req: Request, res: Response) {
  try {
    const organization = await organizationBySlug(req.params.orgSlug);
    const prisma = getPrisma();
    const rows = prisma
      ? await prisma.serviceTime.findMany({ where: { organizationId: organization.id }, orderBy: { sortOrder: 'asc' } })
      : [];
    res.setHeader('Cache-Control', PUBLIC_CACHE);
    res.json({
      serviceTimes: rows.map((row) => ({
        id: row.id,
        name: row.name,
        homeLabel: row.homeLabel,
        cadence: row.cadence,
        weekday: row.weekday,
        opens: row.opens,
        closes: row.closes,
        startLabel: row.startLabel,
        endLabel: row.endLabel,
        place: row.place,
        note: row.note,
        showOnHome: row.showOnHome,
        sortOrder: row.sortOrder,
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export function registerCmsPublicRoutes(app: Express): void {
  app.get('/api/public/:orgSlug/pages', listPages);
  app.get('/api/public/:orgSlug/pages/:slug', getPage);
  app.get('/api/public/:orgSlug/announcements', listAnnouncements);
  app.get('/api/public/:orgSlug/events', listEvents);
  app.get('/api/public/:orgSlug/sermons', listSermons);
  app.get('/api/public/:orgSlug/albums', listAlbums);
  app.get('/api/public/:orgSlug/albums/:slug', getAlbum);
  app.get('/api/public/:orgSlug/videos', listVideos);
  app.get('/api/public/:orgSlug/leaders', listLeaders);
  app.get('/api/public/:orgSlug/groups', listPublicGroups);
  app.get('/api/public/:orgSlug/faqs', listFaqs);
  app.get('/api/public/:orgSlug/service-times', listServiceTimes);
  app.get('/api/public/:orgSlug/live', liveStatus);
  app.post('/api/public/:orgSlug/visitor-cards', createVisitor);
  app.post('/api/public/:orgSlug/events/:eventId/rsvp', createRsvp);
}
