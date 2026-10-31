/**
 * The member area: church members signed in to see their own profile, family, groups,
 * events and prayer requests. Each page is served only when the church has it switched on.
 */
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { CmsNotFound, DatabaseUnavailable, Unauthorized, ValidationError } from '../../shared/errors.ts';
import {
  MEMBER_PAGES,
  effectiveFeatures,
  normalizeMemberArea,
  visibleMemberPages,
  type MemberPageKey,
} from '../../shared/churchSetup.ts';
import { userIdFromDemoToken } from '../demo.ts';
import { sendError } from '../http.ts';
import { getPrisma } from '../prisma.ts';
import { getNextOccurrences } from '../../src/services/sessionScheduler.ts';
import type { PrayerRoom } from '../../src/types/index.ts';
import { assertPublicRateLimit } from '../cms/rateLimit.ts';
import { churchProfileFor } from './cms/public.ts';

function prisma() {
  const client = getPrisma();
  if (!client) throw DatabaseUnavailable();
  return client;
}

function bearer(req: Request): string | null {
  const header = req.headers.authorization;
  return typeof header === 'string' && header.startsWith('Bearer ') ? header.slice(7).trim() || null : null;
}

interface MemberContext {
  member: {
    id: string;
    organizationId: string;
    householdId: string | null;
    firstName: string;
    lastName: string;
    phone: string | null;
    email: string | null;
    birthMonthDay: string | null;
    status: string;
    joinedAt: Date | null;
  };
  organization: { id: string; slug: string; features: unknown; memberArea: unknown };
  pages: Record<MemberPageKey, boolean>;
  canEditProfile: boolean;
}

/** Signed-in member: today through demo sign-in; real churches will use a phone or email code. */
async function memberFrom(req: Request): Promise<MemberContext> {
  const userId = userIdFromDemoToken(bearer(req));
  if (!userId) throw Unauthorized('Sign in as a church member to continue.');
  const member = await prisma().member.findFirst({
    where: { userId },
    include: { organization: { select: { id: true, slug: true, features: true, memberArea: true } } },
  });
  if (!member) throw Unauthorized('This account is not linked to a church member.');
  const settings = normalizeMemberArea(member.organization.memberArea);
  if (!settings.enabled) throw Unauthorized('Your church has turned off member sign-in for now.');
  const pages = visibleMemberPages(settings, effectiveFeatures(member.organization.features));
  return { member, organization: member.organization, pages, canEditProfile: settings.canEditProfile };
}

function requirePage(context: MemberContext, page: MemberPageKey) {
  if (!context.pages[page]) {
    const label = MEMBER_PAGES.find((item) => item.key === page)?.label || page;
    throw Unauthorized(`${label} isn’t part of your church’s member area right now.`);
  }
}

function digits(value: string | null | undefined) {
  return (value || '').replace(/\D/g, '');
}

async function groupsFor(memberId: string, organizationId: string) {
  const db = prisma();
  const rows = await db.groupMember.findMany({
    where: { memberId },
    include: { group: true },
  });
  const groupIds = rows.map((row: { group: { id: string } }) => row.group.id);
  const huddles = groupIds.length
    ? await db.prayerRoom.findMany({
        where: { organizationId, kind: 'HUDDLE', groupId: { in: groupIds } },
        include: { sessions: { where: { status: { in: ['LIVE', 'WAITING'] } }, select: { status: true }, take: 1 } },
      })
    : [];
  return (rows as { role: string; group: { id: string; name: string; meetingTime: string | null; publicDescription: string | null; sortOrder: number } }[])
    .sort((a, b) => a.group.sortOrder - b.group.sortOrder)
    .map((row) => {
      const room = (huddles as unknown as (PrayerRoom & { groupId: string | null; sessions: { status: string }[] })[]).find((item) => item.groupId === row.group.id);
      const next = room ? getNextOccurrences(room as unknown as PrayerRoom, 1)[0] : undefined;
      return {
        id: row.group.id,
        name: row.group.name,
        role: row.role,
        meetingTime: row.group.meetingTime,
        description: row.group.publicDescription,
        huddle: room
          ? {
              name: room.name,
              slug: room.slug,
              status: room.sessions[0]?.status === 'LIVE' || room.sessions[0]?.status === 'WAITING' ? room.sessions[0].status : 'SCHEDULED',
              nextStartsAt: next ? next.toISOString() : null,
            }
          : null,
      };
    });
}

async function getMe(req: Request, res: Response) {
  try {
    const context = await memberFrom(req);
    const { member, organization, pages } = context;
    const db = prisma();
    const church = await churchProfileFor(organization.slug);

    const household =
      pages.household && member.householdId
        ? await db.household.findUnique({
            where: { id: member.householdId },
            include: { members: { select: { id: true, firstName: true, lastName: true, status: true }, orderBy: { firstName: 'asc' } } },
          })
        : null;

    const groups = pages.groups ? await groupsFor(member.id, organization.id) : [];

    let events: { id: string; title: string; startsAt: string; endsAt: string; location: string; rsvpEnabled: boolean; myRsvp: number }[] = [];
    if (pages.events) {
      const rows = await db.event.findMany({
        where: { organizationId: organization.id, startsAt: { gt: new Date() } },
        include: { rsvps: { select: { phone: true, count: true } } },
        orderBy: { startsAt: 'asc' },
        take: 12,
      });
      const mine = digits(member.phone);
      events = (rows as { id: string; title: string; startsAt: Date; endsAt: Date; location: string; rsvpEnabled: boolean; rsvps: { phone: string; count: number }[] }[]).map((row) => ({
        id: row.id,
        title: row.title,
        startsAt: row.startsAt.toISOString(),
        endsAt: row.endsAt.toISOString(),
        location: row.location,
        rsvpEnabled: row.rsvpEnabled,
        myRsvp: mine ? row.rsvps.filter((rsvp) => digits(rsvp.phone) === mine).reduce((sum, rsvp) => sum + rsvp.count, 0) : 0,
      }));
    }

    let prayers: { id: string; message: string | null; status: string; createdAt: string }[] = [];
    if (pages.prayer && member.phone) {
      const rows = await db.visitorCard.findMany({
        where: { organizationId: organization.id, source: 'PRAYER', phone: member.phone },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });
      prayers = (rows as { id: string; message: string | null; status: string; createdAt: Date }[]).map((row) => ({
        id: row.id,
        message: row.message,
        status: row.status,
        createdAt: row.createdAt.toISOString(),
      }));
    }

    res.setHeader('Cache-Control', 'no-store');
    res.json({
      church,
      pages,
      canEditProfile: context.canEditProfile,
      member: pages.profile
        ? {
            firstName: member.firstName,
            lastName: member.lastName,
            phone: member.phone,
            email: member.email,
            birthMonthDay: member.birthMonthDay,
            status: member.status,
            joinedAt: member.joinedAt ? member.joinedAt.toISOString() : null,
          }
        : { firstName: member.firstName, lastName: member.lastName },
      household: household
        ? { name: household.name, members: household.members.map((person: { id: string; firstName: string; lastName: string }) => ({ id: person.id, name: `${person.firstName} ${person.lastName}`, isYou: person.id === member.id })) }
        : null,
      groups,
      events,
      prayers,
    });
  } catch (error) {
    sendError(res, error);
  }
}

const profileSchema = z.object({
  phone: z.string().trim().min(7, 'Enter a phone number.').max(30).optional(),
  email: z.string().trim().email('Enter a valid email.').max(160).or(z.literal('')).optional(),
  birthMonthDay: z
    .string()
    .trim()
    .regex(/^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, 'Use month and day, like 04-21.')
    .or(z.literal(''))
    .optional(),
});

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[issue.path.join('.') || 'form'] = issue.message;
    throw new ValidationError(fieldErrors);
  }
  return result.data;
}

async function updateMe(req: Request, res: Response) {
  try {
    const context = await memberFrom(req);
    requirePage(context, 'profile');
    if (!context.canEditProfile) throw Unauthorized('Your church office updates member details. Ask them to make the change.');
    const input = parse(profileSchema, req.body);
    await prisma().member.update({
      where: { id: context.member.id },
      data: {
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
        ...(input.email !== undefined ? { email: input.email || null } : {}),
        ...(input.birthMonthDay !== undefined ? { birthMonthDay: input.birthMonthDay || null } : {}),
      },
    });
    res.json({ saved: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function rsvp(req: Request, res: Response) {
  try {
    const context = await memberFrom(req);
    requirePage(context, 'events');
    const input = parse(z.object({ count: z.number().int().min(1).max(20) }), req.body);
    if (!context.member.phone) throw new ValidationError({ phone: 'Add your phone number in My profile first.' });
    const event = await prisma().event.findFirst({ where: { id: req.params.eventId, organizationId: context.organization.id } });
    if (!event) throw CmsNotFound('Event not found');
    if (!event.rsvpEnabled) throw Unauthorized('RSVP is not open for this event.');
    const mine = digits(context.member.phone);
    const existing = await prisma().eventRsvp.findMany({ where: { eventId: event.id } });
    const already = (existing as { id: string; phone: string }[]).filter((row) => digits(row.phone) === mine);
    if (already.length) {
      await prisma().eventRsvp.update({ where: { id: already[0].id }, data: { count: input.count } });
    } else {
      await prisma().eventRsvp.create({
        data: { eventId: event.id, name: `${context.member.firstName} ${context.member.lastName}`, phone: context.member.phone, count: input.count },
      });
    }
    res.status(201).json({ saved: true });
  } catch (error) {
    sendError(res, error);
  }
}

async function sendPrayer(req: Request, res: Response) {
  try {
    const context = await memberFrom(req);
    requirePage(context, 'prayer');
    assertPublicRateLimit(`member:${context.member.id}:prayer`);
    const input = parse(z.object({ message: z.string().trim().min(3, 'Tell us what to pray for.').max(2000) }), req.body);
    if (!context.member.phone) throw new ValidationError({ phone: 'Add your phone number in My profile first.' });
    await prisma().visitorCard.create({
      data: {
        organizationId: context.organization.id,
        name: `${context.member.firstName} ${context.member.lastName}`,
        phone: context.member.phone,
        email: context.member.email,
        message: input.message,
        source: 'PRAYER',
      },
    });
    res.status(201).json({ saved: true });
  } catch (error) {
    sendError(res, error);
  }
}

export function registerMemberRoutes(app: Express): void {
  app.get('/api/member/me', getMe);
  app.patch('/api/member/me', updateMe);
  app.post('/api/member/events/:eventId/rsvp', rsvp);
  app.post('/api/member/prayer', sendPrayer);
}
