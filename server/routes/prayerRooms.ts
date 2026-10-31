import type { Request, Response } from 'express';
import { requireCanCreateRoom, requireCanDeleteRoom } from '../authz.ts';
import { resolveActorFromRequest } from '../clerkAuth.ts';
import { env, isLiveKitConfigured } from '../env.ts';
import { sendError } from '../http.ts';
import { RoomNotFound, Unauthorized } from '../../shared/errors.ts';
import { createPrayerRoomSchema, updatePrayerRoomSchema, validationErrorFromZod } from '../../shared/prayerRoom.ts';
import { auditRepository, membershipRepository, prayerRoomRepository, sessionRepository, toPublicPrayerRoom } from '../repositories/index.ts';
import { ensureLiveKitRoom } from '../realtime/ensureLiveKitRoom.ts';
import { getLiveKitProvider } from '../realtime/livekitProvider.ts';
import { roomStartsNow } from '../../src/services/sessionScheduler.ts';
import type { PrayerRoom } from '../../src/types/index.ts';

function normalizeBody(body: unknown): Record<string, unknown> {
  const source = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const next: Record<string, unknown> = { ...source };
  if (source.expectedAttendance !== undefined) next.expectedAttendance = Number(source.expectedAttendance);
  if (source.durationMinutes !== undefined) next.durationMinutes = Number(source.durationMinutes);
  if (typeof source.name === 'string') next.name = source.name.trim();
  if (typeof source.slug === 'string') next.slug = source.slug.trim();
  if (typeof source.description === 'string') next.description = source.description.trim();
  if (typeof source.logoUrl === 'string') next.logoUrl = source.logoUrl.trim();
  if (typeof source.passcode === 'string') next.passcode = source.passcode.trim();
  return next;
}

function asScheduleRoom(room: {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  roomType: string;
  expectedAttendance: number;
  speakerPermission: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  selectedDays: string[];
  oneTimeDate: string | null;
  scheduledStart: string;
  timezone: string;
  recordingEnabled: boolean;
  permanentUrl: string;
}): PrayerRoom {
  return {
    id: room.id,
    organizationId: room.organizationId,
    name: room.name,
    slug: room.slug,
    roomType: room.roomType as PrayerRoom['roomType'],
    expectedAttendance: room.expectedAttendance,
    speakerPermission: room.speakerPermission as PrayerRoom['speakerPermission'],
    isRecurring: room.isRecurring,
    recurrenceRule: (room.recurrenceRule as PrayerRoom['recurrenceRule']) || undefined,
    selectedDays: room.selectedDays,
    oneTimeDate: room.oneTimeDate || undefined,
    scheduledStart: room.scheduledStart,
    timezone: room.timezone,
    recordingEnabled: room.recordingEnabled,
    status: 'SCHEDULED',
    permanentUrl: room.permanentUrl,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export async function listHostCandidatesHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanCreateRoom(actor);
    if (!actor.organizationId) throw Unauthorized();
    const members = await membershipRepository.listByOrganization(actor.organizationId);
    res.json({
      members: members
        .filter((row) => row.status === 'ACTIVE')
        .map((row) => ({
          userId: row.userId,
          name: row.user.name,
          email: row.user.email,
          role: row.role,
        })),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function listPrayerRoomsHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    if (!actor.organizationId || !actor.orgRole) {
      throw Unauthorized();
    }

    const rooms = await prayerRoomRepository.listByOrganization(actor.organizationId);
    res.json({ rooms: rooms.map(toPublicPrayerRoom) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function createPrayerRoomHandler(req: Request, res: Response): Promise<void> {
  try {
    const requestedOrg = typeof req.body?.organizationId === 'string' ? req.body.organizationId : null;
    const actor = await resolveActorFromRequest(req, requestedOrg);
    requireCanCreateRoom(actor);

    const orgId = actor.organizationId;
    if (!orgId) {
      throw RoomNotFound();
    }

    const parsed = createPrayerRoomSchema.safeParse(normalizeBody(req.body));
    if (!parsed.success) throw validationErrorFromZod(parsed.error);
    const input = parsed.data;

    const room = await prayerRoomRepository.create({
      organizationId: orgId,
      name: input.name,
      slug: input.slug,
      description: input.description,
      logoUrl: input.logoUrl || null,
      roomType: input.roomType,
      expectedAttendance: input.expectedAttendance,
      speakerPermission: input.speakerPermission,
      isRecurring: input.isRecurring,
      recurrenceRule: input.recurrenceRule,
      selectedDays: input.selectedDays,
      oneTimeDate: input.isRecurring ? null : input.oneTimeDate ?? null,
      durationMinutes: input.durationMinutes,
      scheduledStart: input.scheduledStart,
      timezone: input.timezone,
      recordingEnabled: input.recordingEnabled,
      passcode: input.passcode || null,
      allowGuests: input.allowGuests,
      prayerRequestsEnabled: input.prayerRequestsEnabled,
      anonymousRequestsAllowed: input.anonymousRequestsAllowed,
      chatEnabled: input.chatEnabled,
      sermonLeaderUserId: input.sermonLeaderUserId ?? null,
      coHostUserIds: input.coHostUserIds,
      createdById: actor.userId ?? undefined,
      appUrl: env.appUrl,
    });

    await auditRepository.write({
      organizationId: orgId,
      actorId: actor.userId,
      action: 'ROOM_CREATED',
      targetId: room.id,
    });

    if (roomStartsNow(asScheduleRoom(room))) {
      const session = await sessionRepository.create({
        prayerRoomId: room.id,
        status: 'WAITING',
      });
      try {
        await ensureLiveKitRoom(session);
      } catch {
        /* Join still works once LiveKit is configured; the sanctuary is already WAITING. */
      }
    }

    res.status(201).json({ room: toPublicPrayerRoom(room) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updatePrayerRoomHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanCreateRoom(actor);

    const orgId = actor.organizationId;
    if (!orgId) {
      throw RoomNotFound();
    }

    const parsed = updatePrayerRoomSchema.safeParse(normalizeBody(req.body));
    if (!parsed.success) throw validationErrorFromZod(parsed.error);
    const input = parsed.data;

    const room = await prayerRoomRepository.update(req.params.roomId, orgId, {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.slug !== undefined ? { slug: input.slug, appUrl: env.appUrl } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl || null } : {}),
      ...(input.roomType !== undefined ? { roomType: input.roomType } : {}),
      ...(input.expectedAttendance !== undefined ? { expectedAttendance: input.expectedAttendance } : {}),
      ...(input.speakerPermission !== undefined ? { speakerPermission: input.speakerPermission } : {}),
      ...(input.isRecurring !== undefined ? { isRecurring: input.isRecurring } : {}),
      ...(input.recurrenceRule !== undefined ? { recurrenceRule: input.recurrenceRule } : {}),
      ...(input.selectedDays !== undefined ? { selectedDays: input.selectedDays } : {}),
      ...(input.oneTimeDate !== undefined || input.isRecurring === true
        ? { oneTimeDate: input.isRecurring ? null : input.oneTimeDate ?? null }
        : {}),
      ...(input.durationMinutes !== undefined ? { durationMinutes: input.durationMinutes } : {}),
      ...(input.scheduledStart !== undefined ? { scheduledStart: input.scheduledStart } : {}),
      ...(input.timezone !== undefined ? { timezone: input.timezone } : {}),
      ...(input.recordingEnabled !== undefined ? { recordingEnabled: input.recordingEnabled } : {}),
      ...(input.passcode !== undefined ? { passcode: input.passcode || null } : {}),
      ...(input.allowGuests !== undefined ? { allowGuests: input.allowGuests } : {}),
      ...(input.prayerRequestsEnabled !== undefined ? { prayerRequestsEnabled: input.prayerRequestsEnabled } : {}),
      ...(input.anonymousRequestsAllowed !== undefined
        ? { anonymousRequestsAllowed: input.anonymousRequestsAllowed }
        : {}),
      ...(input.chatEnabled !== undefined ? { chatEnabled: input.chatEnabled } : {}),
      ...(input.sermonLeaderUserId !== undefined || input.coHostUserIds !== undefined
        ? {
            sermonLeaderUserId: input.sermonLeaderUserId ?? null,
            coHostUserIds: input.coHostUserIds ?? [],
          }
        : {}),
    });

    await auditRepository.write({
      organizationId: orgId,
      actorId: actor.userId,
      action: 'ROOM_UPDATED',
      targetId: room.id,
    });

    res.json({ room: toPublicPrayerRoom(room) });
  } catch (error) {
    sendError(res, error);
  }
}

export async function deletePrayerRoomHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanDeleteRoom(actor);

    const orgId = actor.organizationId;
    if (!orgId) {
      throw RoomNotFound();
    }

    const deleted = await prayerRoomRepository.deleteById(req.params.roomId, orgId);

    await auditRepository.write({
      organizationId: orgId,
      actorId: actor.userId,
      action: 'ROOM_ARCHIVED',
      targetId: req.params.roomId,
    });

    if (isLiveKitConfigured()) {
      for (const roomName of deleted.livekitRoomNames) {
        void getLiveKitProvider().deleteRoom(roomName);
      }
    }

    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}
