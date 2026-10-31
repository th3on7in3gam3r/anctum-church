import { Unauthorized } from '../shared/errors.ts';
import {
  LEADER_UNLINKED_MESSAGE,
  huddleAccess,
  nextHuddleSlug,
  scheduleFromMeetingTime,
  type HuddleAccess,
} from '../shared/huddle.ts';
import type { ActorContext } from './authz.ts';
import { env } from './env.ts';
import { getPrisma } from './prisma.ts';
import { organizationRepository, prayerRoomRepository, sessionRepository } from './repositories/index.ts';
import { cmsRepository } from './repositories/cms.ts';
import { ensureLiveKitRoom } from './realtime/ensureLiveKitRoom.ts';
import { roomStartsNow } from '../src/services/sessionScheduler.ts';
import type { PrayerRoom } from '../src/types/index.ts';

export function huddleDecision(actor: ActorContext, leaderUserId: string | null | undefined): HuddleAccess {
  return huddleAccess({
    orgRole: actor.orgRole,
    actorUserId: actor.userId,
    leaderUserId,
  });
}

export function assertHuddleDecision(access: HuddleAccess): void {
  if (access === 'allow') return;
  if (access === 'unlinked') throw Unauthorized(LEADER_UNLINKED_MESSAGE);
  throw Unauthorized('You can run huddles only for groups you lead.');
}

export async function assertHuddleOperator(
  actor: ActorContext,
  room: { kind?: string | null; groupId?: string | null }
): Promise<void> {
  if (room.kind !== 'HUDDLE') return;
  const prisma = getPrisma();
  let leaderUserId: string | null = null;
  if (prisma && room.groupId) {
    const group = await prisma.group.findUnique({
      where: { id: room.groupId },
      select: { leader: { select: { userId: true } } },
    });
    leaderUserId = group?.leader?.userId ?? null;
  }
  assertHuddleDecision(huddleDecision(actor, leaderUserId));
}

export async function createHuddleRoom(actor: ActorContext, groupId: string) {
  if (!actor.organizationId || !actor.userId) throw Unauthorized('Sign in with a church staff account.');
  const group = await cmsRepository.groupInOrg(actor.organizationId, groupId);
  if (!group) throw Unauthorized('You can run huddles only for groups you lead.');
  assertHuddleDecision(huddleDecision(actor, group.leader?.userId ?? null));
  const leaderUserId = group.leader?.userId;
  if (!leaderUserId) throw Unauthorized(LEADER_UNLINKED_MESSAGE);

  const prisma = getPrisma();
  if (!prisma) throw Unauthorized('The church database is unavailable.');
  const organization = await organizationRepository.findById(actor.organizationId);
  const taken = await prisma.prayerRoom.findMany({
    where: { organizationId: actor.organizationId },
    select: { slug: true },
  });
  const slug = nextHuddleSlug(taken.map((row) => row.slug), group.name);
  const schedule = scheduleFromMeetingTime(group.meetingTime);
  const room = await prayerRoomRepository.create({
    organizationId: actor.organizationId,
    name: `${group.name} Huddle`,
    slug,
    description: group.publicDescription || group.meetingTime || undefined,
    roomType: 'AUDIO_PRAYER',
    expectedAttendance: organization?.defaultExpectedAttendance ?? 40,
    speakerPermission: 'ADMIN_APPROVAL_REQUIRED',
    isRecurring: schedule.isRecurring,
    recurrenceRule: schedule.recurrenceRule || undefined,
    selectedDays: schedule.selectedDays,
    scheduledStart: schedule.scheduledStart || '06:00 PM',
    timezone: organization?.timezone || 'Africa/Kampala',
    allowGuests: true,
    sermonLeaderUserId: leaderUserId,
    coHostUserIds: [leaderUserId],
    createdById: actor.userId,
    appUrl: env.appUrl,
    kind: 'HUDDLE',
    groupId: group.id,
  });

  if (
    roomStartsNow({
      id: room.id,
      organizationId: room.organizationId,
      name: room.name,
      slug: room.slug,
      roomType: 'AUDIO_PRAYER',
      expectedAttendance: room.expectedAttendance,
      speakerPermission: 'ADMIN_APPROVAL_REQUIRED',
      isRecurring: room.isRecurring,
      recurrenceRule: (room.recurrenceRule as PrayerRoom['recurrenceRule']) || undefined,
      selectedDays: room.selectedDays,
      scheduledStart: room.scheduledStart,
      timezone: room.timezone,
      recordingEnabled: false,
      status: 'SCHEDULED',
      permanentUrl: room.permanentUrl,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  ) {
    const session = await sessionRepository.create({ prayerRoomId: room.id, status: 'WAITING' });
    try {
      await ensureLiveKitRoom(session);
    } catch {
      /* The room exists. Audio connects once LiveKit is available. */
    }
  }

  return room;
}
