import type { Express, Request, Response } from 'express';
import type { ZodType } from 'zod';
import {
  announcementSchema,
  cmsValidationError,
  eventSchema,
  faqSchema,
  groupMemberSchema,
  groupSchema,
  householdSchema,
  leaderSchema,
  memberImportSchema,
  memberSchema,
  pageSchema,
  sermonSchema,
  visitorCardSchema,
  visitorStatusSchema,
} from '../../../shared/validations/cms.ts';
import { assertCanEditGroup, requireCmsAdmin, requireMemberReader, requireOrganization } from '../../cms/access.ts';
import { planMemberImport } from '../../cms/phone.ts';
import { resolveActorFromRequest } from '../../clerkAuth.ts';
import { sendError } from '../../http.ts';
import { cmsRepository } from '../../repositories/cms.ts';
import { resolveChannel } from '../../youtube/channel.ts';
import { importYoutubeForOrganization } from '../../youtube/import.ts';
import { getPrisma } from '../../prisma.ts';
import { parseSermonTitle } from '../../../shared/youtube.ts';
import { lookupYoutube } from '../../youtube/lookup.ts';
import { createHuddleRoom } from '../../huddles.ts';
import { toPublicPrayerRoom } from '../../repositories/index.ts';

function optionalSourceTitle(body: unknown): string | null | undefined {
  if (!body || typeof body !== 'object' || !('sourceTitle' in body)) return undefined;
  const value = (body as { sourceTitle?: unknown }).sourceTitle;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || null;
}

function speakerAliasList(body: unknown): string[] {
  const value = body && typeof body === 'object' && 'speakerAliases' in body ? (body as { speakerAliases?: unknown }).speakerAliases : [];
  const parts = Array.isArray(value) ? value : typeof value === 'string' ? value.split(/[\n,]/) : [];
  return [...new Set(parts.map((part) => String(part).trim()).filter(Boolean))];
}

function parseBody<T>(schema: ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) throw cmsValidationError(result.error);
  return result.data;
}

async function actorFrom(req: Request) {
  const actor = await resolveActorFromRequest(req);
  requireOrganization(actor);
  return actor;
}

function queryString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

async function listHouseholds(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ households: await cmsRepository.listHouseholds(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createHousehold(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(householdSchema, req.body);
    const household = await cmsRepository.createHousehold(actor.organizationId!, actor.userId!, input);
    res.status(201).json({ household });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateHousehold(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(householdSchema.partial(), req.body);
    const household = await cmsRepository.updateHousehold(actor.organizationId!, actor.userId!, req.params.id, input);
    res.json({ household });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteHousehold(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteHousehold(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listMembers(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireMemberReader(actor);
    const members = await cmsRepository.listMembers(actor.organizationId!, {
      q: queryString(req.query.q),
      status: queryString(req.query.status),
      groupId: queryString(req.query.groupId),
    });
    res.json({ members });
  } catch (error) {
    sendError(res, error);
  }
}

async function createMember(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(memberSchema, req.body);
    const member = await cmsRepository.createMember(actor.organizationId!, actor.userId!, input);
    res.status(201).json({ member });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateMember(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(memberSchema.partial(), req.body);
    const member = await cmsRepository.updateMember(actor.organizationId!, actor.userId!, req.params.id, input);
    res.json({ member });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteMember(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteMember(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function previewMemberImport(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(memberImportSchema, req.body);
    const existing = await cmsRepository.memberPhones(actor.organizationId!);
    res.json({ rows: planMemberImport(input.rows, existing) });
  } catch (error) {
    sendError(res, error);
  }
}

async function commitMemberImport(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(memberImportSchema, req.body);
    const existing = await cmsRepository.memberPhones(actor.organizationId!);
    const planned = planMemberImport(input.rows, existing);
    const result = await cmsRepository.commitMemberImport(actor.organizationId!, actor.userId!, planned);
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

async function listGroups(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireOrganization(actor);
    if (actor.orgRole === 'PRAYER_LEADER') {
      res.json({ groups: await cmsRepository.listGroups(actor.organizationId!, actor.userId) });
      return;
    }
    requireCmsAdmin(actor);
    res.json({ groups: await cmsRepository.listGroups(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createGroup(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(groupSchema, req.body);
    const group = await cmsRepository.createGroup(actor.organizationId!, actor.userId!, input);
    res.status(201).json({ group });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateGroup(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    const current = await cmsRepository.groupInOrg(actor.organizationId!, req.params.id);
    assertCanEditGroup(actor, current);
    const input = parseBody(groupSchema.partial(), req.body);
    if (actor.orgRole === 'PRAYER_LEADER') {
      delete input.leaderMemberId;
    }
    const group = await cmsRepository.updateGroup(actor.organizationId!, actor.userId!, req.params.id, input);
    res.json({ group });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteGroup(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteGroup(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function addGroupMember(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    const current = await cmsRepository.groupInOrg(actor.organizationId!, req.params.id);
    assertCanEditGroup(actor, current);
    const input = parseBody(groupMemberSchema, req.body);
    const membership = await cmsRepository.addGroupMember(actor.organizationId!, actor.userId!, req.params.id, input);
    res.status(201).json({ membership });
  } catch (error) {
    sendError(res, error);
  }
}

async function removeGroupMember(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    const current = await cmsRepository.groupInOrg(actor.organizationId!, req.params.id);
    assertCanEditGroup(actor, current);
    await cmsRepository.removeGroupMember(actor.organizationId!, actor.userId!, req.params.id, req.params.memberId);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

function registerResource(
  app: Express,
  path: string,
  handlers: {
    list: (req: Request, res: Response) => Promise<void>;
    create: (req: Request, res: Response) => Promise<void>;
    update: (req: Request, res: Response) => Promise<void>;
    remove: (req: Request, res: Response) => Promise<void>;
  }
) {
  app.get(path, handlers.list);
  app.post(path, handlers.create);
  app.patch(`${path}/:id`, handlers.update);
  app.delete(`${path}/:id`, handlers.remove);
}

async function listPages(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ pages: await cmsRepository.listPages(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createPage(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(pageSchema, req.body);
    const page = await cmsRepository.createPage(actor.organizationId!, actor.userId!, input);
    res.status(201).json({ page });
  } catch (error) {
    sendError(res, error);
  }
}

async function updatePage(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(pageSchema.partial(), req.body);
    const page = await cmsRepository.updatePage(actor.organizationId!, actor.userId!, req.params.id, input);
    res.json({ page });
  } catch (error) {
    sendError(res, error);
  }
}

async function deletePage(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deletePage(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listAnnouncements(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ announcements: await cmsRepository.listAnnouncements(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createAnnouncement(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(announcementSchema, req.body);
    const announcement = await cmsRepository.createAnnouncement(actor.organizationId!, actor.userId!, input);
    res.status(201).json({ announcement });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateAnnouncement(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(announcementSchema.partial(), req.body);
    const announcement = await cmsRepository.updateAnnouncement(actor.organizationId!, actor.userId!, req.params.id, input);
    res.json({ announcement });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteAnnouncement(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteAnnouncement(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listEvents(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ events: await cmsRepository.listEvents(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createEvent(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(eventSchema, req.body);
    const event = await cmsRepository.createEvent(actor.organizationId!, actor.userId!, input);
    res.status(201).json({ event });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateEvent(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(eventSchema.partial(), req.body);
    const event = await cmsRepository.updateEvent(actor.organizationId!, actor.userId!, req.params.id, input);
    res.json({ event });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteEvent(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteEvent(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listSermons(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ sermons: await cmsRepository.listSermons(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createSermon(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(sermonSchema, req.body);
    const sermon = await cmsRepository.createSermon(actor.organizationId!, actor.userId!, {
      ...input,
      sourceTitle: optionalSourceTitle(req.body),
    });
    res.status(201).json({ sermon });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateSermon(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(sermonSchema.partial(), req.body);
    const sermon = await cmsRepository.updateSermon(actor.organizationId!, actor.userId!, req.params.id, {
      ...input,
      sourceTitle: optionalSourceTitle(req.body),
    });
    res.json({ sermon });
  } catch (error) {
    sendError(res, error);
  }
}

async function lookupYoutubeVideo(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const result = await lookupYoutube(queryString(req.query.url));
    const prisma = getPrisma();
    const organization = prisma
      ? await prisma.organization.findUnique({
        where: { id: actor.organizationId! },
        select: { defaultSermonSpeaker: true, speakerAliases: true },
      })
      : null;
    const series = prisma
      ? await prisma.sermon.findMany({
        where: { organizationId: actor.organizationId!, seriesName: { not: null } },
        select: { seriesName: true },
        distinct: ['seriesName'],
      })
      : [];
    const parsed = parseSermonTitle(
      result.title,
      { defaultSpeaker: organization?.defaultSermonSpeaker, aliases: organization?.speakerAliases ?? [] },
      series.flatMap((row) => (row.seriesName ? [row.seriesName] : [])),
    );
    res.json({
      ...result,
      sourceTitle: result.title,
      title: parsed.title,
      speaker: parsed.speaker,
      scripture: parsed.scripture,
      seriesName: parsed.seriesName,
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function saveYoutubeChannel(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = typeof req.body?.input === 'string' ? req.body.input.trim() : '';
    const speaker = typeof req.body?.defaultSermonSpeaker === 'string' ? req.body.defaultSermonSpeaker.trim() : '';
    let channelId: string | null = null;
    let channelTitle = '';
    if (input) {
      const resolved = await resolveChannel(input);
      channelId = resolved.channelId;
      channelTitle = resolved.channelTitle;
    }
    const organization = await cmsRepository.saveYoutubeChannel(actor.organizationId!, {
      youtubeChannelId: channelId,
      youtubeChannelInput: input || null,
      defaultSermonSpeaker: speaker || null,
      speakerAliases: speakerAliasList(req.body),
    });
    res.json({
      organization,
      channelTitle,
      message: channelTitle ? `Found: ${channelTitle}` : 'Media settings saved.',
    });
  } catch (error) {
    sendError(res, error);
  }
}

async function importYoutubeNow(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const result = await importYoutubeForOrganization(actor.organizationId!);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}

async function publishSermon(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const sermon = await cmsRepository.publishSermon(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ sermon });
  } catch (error) {
    sendError(res, error);
  }
}

async function ignoreSermon(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.ignoreSermon(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ ignored: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteSermon(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteSermon(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listVisitors(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ visitors: await cmsRepository.listVisitors(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createVisitor(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(visitorCardSchema, req.body);
    const visitor = await cmsRepository.createVisitor(actor.organizationId!, input, actor.userId);
    res.status(201).json({ visitor });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateVisitor(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const input = parseBody(visitorStatusSchema, req.body);
    const visitor = await cmsRepository.updateVisitorStatus(actor.organizationId!, actor.userId!, req.params.id, input.status);
    res.json({ visitor });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteVisitor(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteVisitor(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listLeaders(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ leaders: await cmsRepository.listLeaders(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createLeader(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const leader = await cmsRepository.createLeader(actor.organizationId!, actor.userId!, parseBody(leaderSchema, req.body));
    res.status(201).json({ leader });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateLeader(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const leader = await cmsRepository.updateLeader(actor.organizationId!, actor.userId!, req.params.id, parseBody(leaderSchema.partial(), req.body));
    res.json({ leader });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteLeader(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteLeader(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function listFaqs(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    res.json({ faqs: await cmsRepository.listFaqs(actor.organizationId!) });
  } catch (error) {
    sendError(res, error);
  }
}

async function createFaq(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const faq = await cmsRepository.createFaq(actor.organizationId!, actor.userId!, parseBody(faqSchema, req.body));
    res.status(201).json({ faq });
  } catch (error) {
    sendError(res, error);
  }
}

async function updateFaq(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    const faq = await cmsRepository.updateFaq(actor.organizationId!, actor.userId!, req.params.id, parseBody(faqSchema.partial(), req.body));
    res.json({ faq });
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteFaq(req: Request, res: Response) {
  try {
    const actor = await actorFrom(req);
    requireCmsAdmin(actor);
    await cmsRepository.deleteFaq(actor.organizationId!, actor.userId!, req.params.id);
    res.json({ deleted: true });
  } catch (error) {
    sendError(res, error);
  }
}

export function registerCmsStaffRoutes(app: Express): void {
  app.post('/api/cms/members/import/preview', previewMemberImport);
  app.post('/api/cms/members/import/commit', commitMemberImport);
  registerResource(app, '/api/cms/households', {
    list: listHouseholds,
    create: createHousehold,
    update: updateHousehold,
    remove: deleteHousehold,
  });
  registerResource(app, '/api/cms/members', {
    list: listMembers,
    create: createMember,
    update: updateMember,
    remove: deleteMember,
  });
  app.get('/api/cms/groups', listGroups);
  app.post('/api/cms/groups', createGroup);
  app.patch('/api/cms/groups/:id', updateGroup);
  app.delete('/api/cms/groups/:id', deleteGroup);
  app.post('/api/cms/groups/:id/huddle', async (req, res) => {
    try {
      const actor = await actorFrom(req);
      const room = await createHuddleRoom(actor, req.params.id);
      res.status(201).json({ room: toPublicPrayerRoom(room) });
    } catch (error) {
      sendError(res, error);
    }
  });
  app.post('/api/cms/groups/:id/members', addGroupMember);
  app.delete('/api/cms/groups/:id/members/:memberId', removeGroupMember);
  registerResource(app, '/api/cms/pages', { list: listPages, create: createPage, update: updatePage, remove: deletePage });
  registerResource(app, '/api/cms/announcements', {
    list: listAnnouncements,
    create: createAnnouncement,
    update: updateAnnouncement,
    remove: deleteAnnouncement,
  });
  registerResource(app, '/api/cms/events', { list: listEvents, create: createEvent, update: updateEvent, remove: deleteEvent });
  app.get('/api/cms/youtube/lookup', lookupYoutubeVideo);
  app.post('/api/cms/youtube/channel', saveYoutubeChannel);
  app.post('/api/cms/youtube/import', importYoutubeNow);
  app.post('/api/cms/sermons/:id/publish', publishSermon);
  app.post('/api/cms/sermons/:id/ignore', ignoreSermon);
  registerResource(app, '/api/cms/sermons', { list: listSermons, create: createSermon, update: updateSermon, remove: deleteSermon });
  registerResource(app, '/api/cms/leaders', { list: listLeaders, create: createLeader, update: updateLeader, remove: deleteLeader });
  registerResource(app, '/api/cms/faqs', { list: listFaqs, create: createFaq, update: updateFaq, remove: deleteFaq });
  registerResource(app, '/api/cms/visitors', {
    list: listVisitors,
    create: createVisitor,
    update: updateVisitor,
    remove: deleteVisitor,
  });
}
