import { DatabaseUnavailable, DuplicateSlug, ParticipantNotFound, RoomNotFound, SessionNotFound, ValidationError } from '../../shared/errors.ts';
import { hashPasscode } from '../../shared/passcode.ts';
import { ensureSlugAvailable } from '../../shared/slug.ts';
import type { OrganizationRole, SessionRole } from '../../shared/roles.ts';
import type { SessionLifecycleState } from '../../shared/sessionStateMachine.ts';
import { getPrisma, isPrismaPoolTimeout } from '../prisma.ts';

export interface PrayerRoomRecord {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  roomType: string;
  expectedAttendance: number;
  speakerPermission: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  selectedDays: string[];
  oneTimeDate: string | null;
  durationMinutes: number;
  scheduledStart: string;
  timezone: string;
  recordingEnabled: boolean;
  passcodeHash: string | null;
  allowGuests: boolean;
  prayerRequestsEnabled: boolean;
  anonymousRequestsAllowed: boolean;
  chatEnabled: boolean;
  hasPasscode: boolean;
  kind: string;
  groupId: string | null;
  sermonLeaderUserId: string | null;
  coHostUserIds: string[];
  status: string;
  livekitRoomName: string | null;
  permanentUrl: string;
  createdById: string | null;
}

export interface PrayerSessionRecord {
  id: string;
  prayerRoomId: string;
  status: SessionLifecycleState;
  scheduledStart: Date | null;
  actualStart: Date | null;
  endedAt: Date | null;
  livekitRoomName: string | null;
  sermonLeaderName: string;
  activeSpeakerParticipantId: string | null;
  peakConcurrentParticipants: number;
  congregationMuted?: boolean;
}

export interface SessionParticipantRecord {
  id: string;
  sessionId: string;
  userId: string | null;
  guestName: string | null;
  realtimeIdentity: string;
  role: SessionRole;
  baseRole: SessionRole;
  leftAt: Date | null;
}

export interface MembershipRecord {
  organizationId: string;
  userId: string;
  role: OrganizationRole;
  status: string;
  canPublishGallery: boolean;
}

function requirePrisma() {
  const prisma = getPrisma();
  if (!prisma) throw DatabaseUnavailable();
  return prisma;
}

const roomInclude = { hosts: { select: { userId: true, role: true } } } as const;

type RoomHostRow = { userId: string; role: string };

function mapRoom(row: {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description: string | null;
  roomType: string;
  expectedAttendance: number;
  speakerPermission: string;
  isRecurring: boolean;
  recurrenceRule: string | null;
  selectedDays?: string[];
  oneTimeDate?: string | null;
  durationMinutes?: number;
  scheduledStart: string;
  timezone: string;
  recordingEnabled: boolean;
  passcodeHash?: string | null;
  allowGuests?: boolean;
  prayerRequestsEnabled?: boolean;
  anonymousRequestsAllowed?: boolean;
  chatEnabled?: boolean;
  kind?: string;
  groupId?: string | null;
  status: string;
  livekitRoomName: string | null;
  permanentUrl: string;
  createdById: string | null;
  hosts?: RoomHostRow[];
}): PrayerRoomRecord {
  const hosts = row.hosts ?? [];
  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    slug: row.slug,
    description: row.description,
    roomType: row.roomType,
    expectedAttendance: row.expectedAttendance,
    speakerPermission: row.speakerPermission,
    isRecurring: row.isRecurring,
    recurrenceRule: row.recurrenceRule,
    selectedDays: row.selectedDays ?? [],
    oneTimeDate: row.oneTimeDate ?? null,
    durationMinutes: row.durationMinutes ?? 60,
    scheduledStart: row.scheduledStart,
    timezone: row.timezone,
    recordingEnabled: row.recordingEnabled,
    passcodeHash: row.passcodeHash ?? null,
    allowGuests: row.allowGuests !== false,
    prayerRequestsEnabled: row.prayerRequestsEnabled !== false,
    anonymousRequestsAllowed: row.anonymousRequestsAllowed !== false,
    chatEnabled: row.chatEnabled !== false,
    hasPasscode: Boolean(row.passcodeHash),
    kind: row.kind || 'CORPORATE',
    groupId: row.groupId ?? null,
    sermonLeaderUserId: hosts.find((host) => host.role === 'SERMON_LEADER')?.userId ?? null,
    coHostUserIds: hosts.filter((host) => host.role === 'CO_HOST').map((host) => host.userId),
    status: row.status,
    livekitRoomName: row.livekitRoomName,
    permanentUrl: row.permanentUrl,
    createdById: row.createdById,
  };
}

export function toPublicPrayerRoom(room: PrayerRoomRecord) {
  const { passcodeHash: _passcodeHash, ...rest } = room;
  return rest;
}

async function replaceRoomHosts(
  prisma: ReturnType<typeof requirePrisma>,
  organizationId: string,
  roomId: string,
  sermonLeaderUserId: string | null | undefined,
  coHostUserIds: string[] | undefined
) {
  if (sermonLeaderUserId === undefined && coHostUserIds === undefined) return;
  const leaderId = sermonLeaderUserId || null;
  const coHosts = (coHostUserIds ?? []).filter((userId) => userId && userId !== leaderId);
  const userIds = [...new Set([...(leaderId ? [leaderId] : []), ...coHosts])];
  for (const userId of userIds) {
    const membership = await prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
    if (!membership || membership.status !== 'ACTIVE') {
      throw new ValidationError(
        leaderId === userId
          ? { sermonLeaderUserId: 'Choose an active church member.' }
          : { coHostUserIds: 'Co-hosts must be active church members.' }
      );
    }
  }
  await prisma.prayerRoomHost.deleteMany({ where: { roomId } });
  const rows = [
    ...(leaderId ? [{ roomId, userId: leaderId, role: 'SERMON_LEADER' as const }] : []),
    ...coHosts.map((userId) => ({ roomId, userId, role: 'CO_HOST' as const })),
  ];
  if (rows.length) {
    await prisma.prayerRoomHost.createMany({ data: rows });
  }
}

export const prayerRoomRepository = {
  async findById(id: string): Promise<PrayerRoomRecord | null> {
    const prisma = requirePrisma();
    const row = await prisma.prayerRoom.findUnique({ where: { id }, include: roomInclude });
    return row ? mapRoom(row) : null;
  },

  async findBySlug(slug: string): Promise<PrayerRoomRecord | null> {
    const prisma = requirePrisma();
    const row = await prisma.prayerRoom.findFirst({ where: { slug }, include: roomInclude, orderBy: { createdAt: 'asc' } });
    return row ? mapRoom(row) : null;
  },

  async findPublicAltarBySlug(slug: string) {
    const prisma = requirePrisma();
    return prisma.prayerRoom.findFirst({
      where: { slug },
      include: {
        organization: { select: { name: true, slug: true, logoUrl: true, defaultSermonSpeaker: true } },
        hosts: {
          where: { role: 'SERMON_LEADER' },
          select: { user: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  },

  async findByOrgAndSlug(organizationId: string, slug: string): Promise<PrayerRoomRecord | null> {
    const prisma = requirePrisma();
    const row = await prisma.prayerRoom.findUnique({
      where: { organizationId_slug: { organizationId, slug } },
      include: roomInclude,
    });
    return row ? mapRoom(row) : null;
  },

  async listByOrganization(organizationId: string): Promise<PrayerRoomRecord[]> {
    const prisma = requirePrisma();
    const rows = await prisma.prayerRoom.findMany({
      where: { organizationId },
      include: roomInclude,
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => mapRoom(row));
  },

  async create(input: {
    organizationId: string;
    name: string;
    slug: string;
    description?: string;
    logoUrl?: string | null;
    roomType?: string;
    expectedAttendance?: number;
    speakerPermission?: string;
    isRecurring?: boolean;
    recurrenceRule?: string;
    selectedDays?: string[];
    oneTimeDate?: string | null;
    durationMinutes?: number;
    scheduledStart?: string;
    timezone?: string;
    recordingEnabled?: boolean;
    passcode?: string | null;
    allowGuests?: boolean;
    prayerRequestsEnabled?: boolean;
    anonymousRequestsAllowed?: boolean;
    chatEnabled?: boolean;
    sermonLeaderUserId?: string | null;
    coHostUserIds?: string[];
    createdById?: string;
    appUrl: string;
    kind?: 'CORPORATE' | 'HUDDLE';
    groupId?: string | null;
  }): Promise<PrayerRoomRecord> {
    const prisma = requirePrisma();
    const existing = await prisma.prayerRoom.findUnique({
      where: { organizationId_slug: { organizationId: input.organizationId, slug: input.slug } },
    });
    ensureSlugAvailable(Boolean(existing), input.slug);

    try {
      const created = await prisma.prayerRoom.create({
        data: {
          organizationId: input.organizationId,
          name: input.name,
          slug: input.slug,
          description: input.description,
          logoUrl: input.logoUrl || null,
          roomType: (input.roomType as 'AUDIO_PRAYER') ?? 'AUDIO_PRAYER',
          expectedAttendance: input.expectedAttendance ?? 1000,
          speakerPermission: (input.speakerPermission as 'ADMIN_APPROVAL_REQUIRED') ?? 'ADMIN_APPROVAL_REQUIRED',
          isRecurring: input.isRecurring ?? false,
          recurrenceRule: input.recurrenceRule,
          selectedDays: input.selectedDays ?? [],
          oneTimeDate: input.oneTimeDate ?? null,
          durationMinutes: input.durationMinutes ?? 60,
          scheduledStart: input.scheduledStart ?? '05:00 AM',
          timezone: input.timezone ?? 'Africa/Kampala',
          recordingEnabled: input.recordingEnabled ?? false,
          passcodeHash: input.passcode ? hashPasscode(input.passcode) : null,
          allowGuests: input.allowGuests ?? true,
          prayerRequestsEnabled: input.prayerRequestsEnabled ?? true,
          anonymousRequestsAllowed: input.anonymousRequestsAllowed ?? true,
          chatEnabled: input.chatEnabled ?? true,
          createdById: input.createdById,
          kind: input.kind ?? 'CORPORATE',
          groupId: input.groupId ?? null,
          permanentUrl: `${input.appUrl}/join/${input.slug}`,
        },
      });
      await replaceRoomHosts(
        prisma,
        input.organizationId,
        created.id,
        input.sermonLeaderUserId,
        input.coHostUserIds
      );
      const row = await prisma.prayerRoom.findUnique({ where: { id: created.id }, include: roomInclude });
      if (!row) throw RoomNotFound(created.id);
      return mapRoom(row);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === 'P2002') throw DuplicateSlug(input.slug);
      throw error;
    }
  },

  async update(
    id: string,
    organizationId: string,
    data: {
      name?: string;
      slug?: string;
      description?: string | null;
      logoUrl?: string | null;
      roomType?: string;
      expectedAttendance?: number;
      speakerPermission?: string;
      isRecurring?: boolean;
      recurrenceRule?: string | null;
      selectedDays?: string[];
      oneTimeDate?: string | null;
      durationMinutes?: number;
      scheduledStart?: string;
      timezone?: string;
      recordingEnabled?: boolean;
      passcode?: string | null;
      allowGuests?: boolean;
      prayerRequestsEnabled?: boolean;
      anonymousRequestsAllowed?: boolean;
      chatEnabled?: boolean;
      sermonLeaderUserId?: string | null;
      coHostUserIds?: string[];
      appUrl?: string;
    }
  ): Promise<PrayerRoomRecord> {
    const prisma = requirePrisma();
    const room = await prisma.prayerRoom.findFirst({ where: { id, organizationId } });
    if (!room) throw RoomNotFound(id);

    if (data.slug && data.slug !== room.slug) {
      const clash = await prisma.prayerRoom.findUnique({
        where: { organizationId_slug: { organizationId, slug: data.slug } },
      });
      ensureSlugAvailable(Boolean(clash), data.slug);
    }

    try {
      const nextSlug = data.slug !== undefined ? data.slug : room.slug;
      const permanentUrl =
        data.slug !== undefined && data.appUrl
          ? `${data.appUrl.replace(/\/$/, '')}/join/${nextSlug}`
          : undefined;

      await prisma.prayerRoom.update({
        where: { id },
        data: {
          ...(data.name !== undefined ? { name: data.name } : {}),
          ...(data.slug !== undefined ? { slug: data.slug } : {}),
          ...(permanentUrl ? { permanentUrl } : {}),
          ...(data.description !== undefined ? { description: data.description } : {}),
          ...(data.logoUrl !== undefined ? { logoUrl: data.logoUrl } : {}),
          ...(data.roomType !== undefined ? { roomType: data.roomType as 'AUDIO_PRAYER' } : {}),
          ...(data.expectedAttendance !== undefined ? { expectedAttendance: data.expectedAttendance } : {}),
          ...(data.speakerPermission !== undefined
            ? { speakerPermission: data.speakerPermission as 'ADMIN_APPROVAL_REQUIRED' }
            : {}),
          ...(data.isRecurring !== undefined ? { isRecurring: data.isRecurring } : {}),
          ...(data.recurrenceRule !== undefined ? { recurrenceRule: data.recurrenceRule } : {}),
          ...(data.selectedDays !== undefined ? { selectedDays: data.selectedDays } : {}),
          ...(data.oneTimeDate !== undefined ? { oneTimeDate: data.oneTimeDate } : {}),
          ...(data.durationMinutes !== undefined ? { durationMinutes: data.durationMinutes } : {}),
          ...(data.scheduledStart !== undefined ? { scheduledStart: data.scheduledStart } : {}),
          ...(data.timezone !== undefined ? { timezone: data.timezone } : {}),
          ...(data.recordingEnabled !== undefined ? { recordingEnabled: data.recordingEnabled } : {}),
          ...(data.passcode !== undefined
            ? { passcodeHash: data.passcode ? hashPasscode(data.passcode) : null }
            : {}),
          ...(data.allowGuests !== undefined ? { allowGuests: data.allowGuests } : {}),
          ...(data.prayerRequestsEnabled !== undefined
            ? { prayerRequestsEnabled: data.prayerRequestsEnabled }
            : {}),
          ...(data.anonymousRequestsAllowed !== undefined
            ? { anonymousRequestsAllowed: data.anonymousRequestsAllowed }
            : {}),
          ...(data.chatEnabled !== undefined ? { chatEnabled: data.chatEnabled } : {}),
        },
      });
      if (data.sermonLeaderUserId !== undefined || data.coHostUserIds !== undefined) {
        await replaceRoomHosts(prisma, organizationId, id, data.sermonLeaderUserId, data.coHostUserIds ?? []);
      }
      const row = await prisma.prayerRoom.findUnique({ where: { id }, include: roomInclude });
      if (!row) throw RoomNotFound(id);
      return mapRoom(row);
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === 'P2002') throw DuplicateSlug(data.slug || room.slug);
      throw error;
    }
  },

  async deleteById(id: string, organizationId: string): Promise<{ livekitRoomNames: string[] }> {
    const prisma = requirePrisma();
    const room = await prisma.prayerRoom.findFirst({ where: { id, organizationId } });
    if (!room) throw RoomNotFound(id);

    const sessions = await prisma.prayerSession.findMany({
      where: { prayerRoomId: id },
      select: { id: true, livekitRoomName: true },
    });
    const sessionIds = sessions.map((row) => row.id);
    const livekitRoomNames = [
      ...new Set(
        [...sessions.map((row) => row.livekitRoomName), room.livekitRoomName].filter(
          (name): name is string => Boolean(name)
        )
      ),
    ];

    const runDelete = () =>
      prisma.$transaction(
        async (tx) => {
          if (sessionIds.length) {
            await tx.prayerSession.updateMany({
              where: { id: { in: sessionIds } },
              data: { activeSpeakerParticipantId: null },
            });
            await tx.prayerSession.deleteMany({ where: { id: { in: sessionIds } } });
          }
          await tx.prayerRoom.delete({ where: { id } });
        },
        { maxWait: 10_000, timeout: 15_000 }
      );

    try {
      await runDelete();
    } catch (error) {
      if (!isPrismaPoolTimeout(error)) throw error;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await runDelete();
    }

    return { livekitRoomNames };
  },
};

export interface UserRecord {
  id: string;
  clerkUserId: string | null;
  name: string;
  email: string;
}

export const userRepository = {
  async findById(id: string): Promise<UserRecord | null> {
    const prisma = requirePrisma();
    return prisma.user.findUnique({ where: { id } });
  },
  async findNameById(id: string): Promise<string | null> {
    const prisma = requirePrisma();
    const user = await prisma.user.findUnique({ where: { id }, select: { name: true } });
    return user?.name ?? null;
  },
  async findByEmail(email: string): Promise<UserRecord | null> {
    const prisma = requirePrisma();
    return prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
  },
  async findByClerkUserId(clerkUserId: string): Promise<UserRecord | null> {
    const prisma = requirePrisma();
    return prisma.user.findUnique({ where: { clerkUserId } });
  },
  async setClerkUserId(id: string, clerkUserId: string): Promise<void> {
    const prisma = requirePrisma();
    await prisma.user.update({ where: { id }, data: { clerkUserId } });
  },
  async create(input: { name: string; email: string; clerkUserId?: string }): Promise<UserRecord> {
    const prisma = requirePrisma();
    return prisma.user.create({
      data: {
        name: input.name,
        email: input.email.toLowerCase(),
        clerkUserId: input.clerkUserId,
      },
    });
  },
};

export const organizationRepository = {
  async findById(id: string) {
    const prisma = requirePrisma();
    return prisma.organization.findUnique({ where: { id } });
  },
  async findBySlug(slug: string) {
    const prisma = requirePrisma();
    return prisma.organization.findUnique({ where: { slug } });
  },
  async create(input: {
    name: string;
    slug: string;
    primaryContactName: string;
    primaryContactEmail: string;
    logoUrl?: string | null;
  }) {
    const prisma = requirePrisma();
    return prisma.organization.create({
      data: {
        name: input.name,
        slug: input.slug,
        primaryContactName: input.primaryContactName,
        primaryContactEmail: input.primaryContactEmail,
        logoUrl: input.logoUrl || null,
        joinPageMessage: 'Join your church family in prayer.',
      },
    });
  },
  async update(
    id: string,
    data: {
      name?: string;
      slug?: string;
      logoUrl?: string | null;
      country?: string;
      timezone?: string;
      website?: string | null;
      joinPageMessage?: string | null;
      accentColor?: string | null;
    }
  ) {
    const prisma = requirePrisma();
    return prisma.organization.update({ where: { id }, data });
  },
  async deleteById(organizationId: string): Promise<void> {
    const prisma = requirePrisma();
    const rooms = await prisma.prayerRoom.findMany({
      where: { organizationId },
      select: { id: true },
    });
    const roomIds = rooms.map((row) => row.id);
    const sessions = roomIds.length
      ? await prisma.prayerSession.findMany({
          where: { prayerRoomId: { in: roomIds } },
          select: { id: true },
        })
      : [];
    const sessionIds = sessions.map((row) => row.id);

    await prisma.$transaction(async (tx) => {
      if (sessionIds.length) {
        await tx.prayerSession.updateMany({
          where: { id: { in: sessionIds } },
          data: { activeSpeakerParticipantId: null },
        });
        await tx.prayerSession.deleteMany({ where: { id: { in: sessionIds } } });
      }
      if (roomIds.length) {
        await tx.prayerRoom.deleteMany({ where: { id: { in: roomIds } } });
      }
      await tx.organization.delete({ where: { id: organizationId } });
    });
  },
};

export const membershipRepository = {
  async find(organizationId: string, userId: string): Promise<MembershipRecord | null> {
    const prisma = requirePrisma();
    return prisma.organizationMembership.findUnique({
      where: { organizationId_userId: { organizationId, userId } },
    });
  },
  async listActiveByUser(userId: string): Promise<MembershipRecord[]> {
    const prisma = requirePrisma();
    return prisma.organizationMembership.findMany({
      where: { userId, status: 'ACTIVE' },
    });
  },
  async listByOrganization(organizationId: string): Promise<
    Array<MembershipRecord & { user: { id: string; name: string; email: string } }>
  > {
    const prisma = requirePrisma();
    return prisma.organizationMembership.findMany({
      where: { organizationId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'asc' },
    });
  },
  async upsertInvite(input: {
    organizationId: string;
    userId: string;
    role: OrganizationRole;
  }): Promise<MembershipRecord> {
    const prisma = requirePrisma();
    return prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: input.organizationId, userId: input.userId } },
      create: {
        organizationId: input.organizationId,
        userId: input.userId,
        role: input.role,
        status: 'INVITED',
      },
      update: {
        role: input.role,
        status: 'INVITED',
      },
    });
  },
  async activateInvitedForUser(userId: string): Promise<void> {
    const prisma = requirePrisma();
    await prisma.organizationMembership.updateMany({
      where: { userId, status: 'INVITED' },
      data: { status: 'ACTIVE' },
    });
  },
  async ensureActiveOwner(organizationId: string, userId: string): Promise<MembershipRecord> {
    const prisma = requirePrisma();
    return prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId, userId } },
      create: {
        organizationId,
        userId,
        role: 'OWNER',
        status: 'ACTIVE',
      },
      update: {
        role: 'OWNER',
        status: 'ACTIVE',
      },
    });
  },
  async remove(organizationId: string, userId: string): Promise<void> {
    const prisma = requirePrisma();
    await prisma.organizationMembership.delete({
      where: { organizationId_userId: { organizationId, userId } },
    });
  },
};

export const sessionRepository = {
  async findById(id: string): Promise<PrayerSessionRecord | null> {
    const prisma = requirePrisma();
    return prisma.prayerSession.findUnique({ where: { id } }) as Promise<PrayerSessionRecord | null>;
  },

  async requireById(id: string): Promise<PrayerSessionRecord> {
    const session = await this.findById(id);
    if (!session) throw SessionNotFound(id);
    return session;
  },

  async create(input: {
    prayerRoomId: string;
    status?: SessionLifecycleState;
    scheduledStart?: Date | null;
    livekitRoomName?: string;
    sermonLeaderName?: string | null;
  }): Promise<PrayerSessionRecord> {
    const prisma = requirePrisma();
    const room = await prisma.prayerRoom.findUnique({ where: { id: input.prayerRoomId } });
    if (!room) throw RoomNotFound(input.prayerRoomId);
    return prisma.prayerSession.create({
      data: {
        prayerRoomId: input.prayerRoomId,
        status: input.status ?? 'SCHEDULED',
        scheduledStart: input.scheduledStart ?? null,
        livekitRoomName: input.livekitRoomName,
        sermonLeaderName: input.sermonLeaderName ?? '',
      },
    }) as Promise<PrayerSessionRecord>;
  },

  async update(id: string, data: Partial<PrayerSessionRecord>): Promise<PrayerSessionRecord> {
    const prisma = requirePrisma();
    return prisma.prayerSession.update({
      where: { id },
      data: {
        status: data.status,
        scheduledStart: data.scheduledStart,
        actualStart: data.actualStart,
        endedAt: data.endedAt,
        livekitRoomName: data.livekitRoomName,
        sermonLeaderName: data.sermonLeaderName,
        activeSpeakerParticipantId: data.activeSpeakerParticipantId,
        peakConcurrentParticipants: data.peakConcurrentParticipants,
        congregationMuted: data.congregationMuted,
      },
    }) as Promise<PrayerSessionRecord>;
  },

  async findJoinableByRoom(prayerRoomId: string): Promise<PrayerSessionRecord | null> {
    const prisma = requirePrisma();
    return prisma.prayerSession.findFirst({
      where: { prayerRoomId, status: { in: ['WAITING', 'STARTING', 'LIVE'] } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<PrayerSessionRecord | null>;
  },

  async findOpenableByRoom(prayerRoomId: string): Promise<PrayerSessionRecord | null> {
    const prisma = requirePrisma();
    return prisma.prayerSession.findFirst({
      where: { prayerRoomId, status: { in: ['SCHEDULED', 'WAITING'] } },
      orderBy: { createdAt: 'desc' },
    }) as Promise<PrayerSessionRecord | null>;
  },

  async findByLiveKitRoomName(livekitRoomName: string): Promise<PrayerSessionRecord | null> {
    const prisma = requirePrisma();
    return prisma.prayerSession.findFirst({
      where: { livekitRoomName },
      orderBy: { createdAt: 'desc' },
    }) as Promise<PrayerSessionRecord | null>;
  },

  async bumpPeakConcurrent(id: string, connectedNow: number): Promise<void> {
    const prisma = requirePrisma();
    const session = await prisma.prayerSession.findUnique({ where: { id } });
    if (!session) return;
    if (connectedNow > session.peakConcurrentParticipants) {
      await prisma.prayerSession.update({
        where: { id },
        data: { peakConcurrentParticipants: connectedNow },
      });
    }
  },
};

export const participantRepository = {
  async findById(id: string): Promise<SessionParticipantRecord | null> {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.findUnique({ where: { id } });
  },

  async requireById(id: string): Promise<SessionParticipantRecord> {
    const participant = await this.findById(id);
    if (!participant) throw ParticipantNotFound(id);
    return participant;
  },

  async findByRealtimeIdentity(sessionId: string, realtimeIdentity: string): Promise<SessionParticipantRecord | null> {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.findUnique({
      where: { sessionId_realtimeIdentity: { sessionId, realtimeIdentity } },
    });
  },

  async create(input: {
    sessionId: string;
    userId?: string | null;
    guestName?: string | null;
    realtimeIdentity: string;
    role: SessionRole;
    baseRole?: SessionRole;
  }): Promise<SessionParticipantRecord> {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.create({
      data: {
        sessionId: input.sessionId,
        userId: input.userId ?? null,
        guestName: input.guestName ?? null,
        realtimeIdentity: input.realtimeIdentity,
        role: input.role,
        baseRole: input.baseRole ?? input.role,
      },
    });
  },

  async updateRole(id: string, role: SessionRole): Promise<SessionParticipantRecord> {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.update({ where: { id }, data: { role } });
  },

  async markLeft(id: string): Promise<void> {
    const prisma = requirePrisma();
    await prisma.sessionParticipant.update({ where: { id }, data: { leftAt: new Date() } });
  },

  async markRejoined(id: string): Promise<SessionParticipantRecord> {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.update({ where: { id }, data: { leftAt: null } });
  },

  async updateDisplayName(id: string, guestName: string): Promise<SessionParticipantRecord> {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.update({ where: { id }, data: { guestName } });
  },

  async listBySession(sessionId: string) {
    const prisma = requirePrisma();
    return prisma.sessionParticipant.findMany({
      where: { sessionId },
      orderBy: { joinedAt: 'asc' },
      include: { user: { select: { name: true } } },
    });
  },
};

export const raisedHandRepository = {
  async create(sessionId: string, participantId: string) {
    const prisma = requirePrisma();
    return prisma.raisedHand.create({
      data: { sessionId, participantId, status: 'WAITING' },
    });
  },

  async upsertWaiting(sessionId: string, participantId: string) {
    const prisma = requirePrisma();
    const existing = await prisma.raisedHand.findFirst({
      where: { sessionId, participantId, status: { in: ['WAITING', 'INVITED'] } },
      orderBy: { raisedAt: 'desc' },
    });
    if (existing) return existing;
    return prisma.raisedHand.create({
      data: { sessionId, participantId, status: 'WAITING' },
    });
  },

  async findById(id: string) {
    const prisma = requirePrisma();
    return prisma.raisedHand.findUnique({ where: { id } });
  },

  async findOpenForParticipant(sessionId: string, participantId: string) {
    const prisma = requirePrisma();
    return prisma.raisedHand.findFirst({
      where: { sessionId, participantId, status: { in: ['WAITING', 'INVITED'] } },
      orderBy: { raisedAt: 'desc' },
    });
  },

  async updateStatus(id: string, status: 'WAITING' | 'INVITED' | 'DISMISSED' | 'RESOLVED') {
    const prisma = requirePrisma();
    return prisma.raisedHand.update({
      where: { id },
      data: {
        status,
        resolvedAt: status === 'DISMISSED' || status === 'RESOLVED' ? new Date() : null,
      },
    });
  },

  async listWaiting(sessionId: string) {
    const prisma = requirePrisma();
    return prisma.raisedHand.findMany({
      where: { sessionId, status: { in: ['WAITING', 'INVITED'] } },
      orderBy: { raisedAt: 'asc' },
      include: { participant: { include: { user: { select: { name: true } } } } },
    });
  },
};

export const chatMessageRepository = {
  async create(input: { sessionId: string; displayName: string; body: string }) {
    const prisma = requirePrisma();
    return prisma.sessionChatMessage.create({
      data: {
        sessionId: input.sessionId,
        displayName: input.displayName,
        body: input.body,
      },
    });
  },

  async listBySession(sessionId: string, limit = 100) {
    const prisma = requirePrisma();
    const rows = await prisma.sessionChatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse();
  },
};

export const speakerInvitationRepository = {
  async create(input: { sessionId: string; participantId: string; invitedById?: string | null }) {
    const prisma = requirePrisma();
    const existing = await prisma.speakerInvitation.findFirst({
      where: { sessionId: input.sessionId, participantId: input.participantId, status: 'PENDING' },
    });
    if (existing) return existing;
    return prisma.speakerInvitation.create({
      data: {
        sessionId: input.sessionId,
        participantId: input.participantId,
        invitedById: input.invitedById ?? null,
        status: 'PENDING',
      },
    });
  },

  async findById(id: string) {
    const prisma = requirePrisma();
    return prisma.speakerInvitation.findUnique({ where: { id } });
  },

  async findPendingForParticipant(sessionId: string, participantId: string) {
    const prisma = requirePrisma();
    return prisma.speakerInvitation.findFirst({
      where: { sessionId, participantId, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
  },

  async listPending(sessionId: string) {
    const prisma = requirePrisma();
    return prisma.speakerInvitation.findMany({
      where: { sessionId, status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
  },

  async updateStatus(id: string, status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'DECLINED' | 'EXPIRED') {
    const prisma = requirePrisma();
    return prisma.speakerInvitation.update({
      where: { id },
      data: {
        status,
        acceptedAt: status === 'ACCEPTED' ? new Date() : undefined,
        revokedAt: status === 'REVOKED' || status === 'DECLINED' || status === 'EXPIRED' ? new Date() : undefined,
      },
    });
  },
};

export const webhookEventRepository = {
  async recordIfNew(eventId: string, eventType: string, roomName: string | null, payload: unknown): Promise<boolean> {
    const prisma = requirePrisma();
    try {
      await prisma.webhookEvent.create({
        data: {
          eventId,
          eventType,
          roomName,
          payload: payload as object,
        },
      });
      return true;
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error ? String((error as { code: string }).code) : '';
      if (code === 'P2002') return false;
      throw error;
    }
  },
};

export const auditRepository = {
  async write(input: {
    organizationId?: string | null;
    sessionId?: string | null;
    actorId?: string | null;
    action:
      | 'ROOM_CREATED'
      | 'ROOM_UPDATED'
      | 'ROOM_ARCHIVED'
      | 'SESSION_STARTED'
      | 'SESSION_ENDED'
      | 'SESSION_CANCELLED'
      | 'PARTICIPANT_JOINED'
      | 'PARTICIPANT_REMOVED'
      | 'HAND_RAISED'
      | 'SPEAKER_INVITED'
      | 'SPEAKER_GRANTED'
      | 'SPEAKER_REVOKED'
      | 'SPEAKER_TRANSFERRED'
      | 'ROLE_CHANGED';
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }) {
    const prisma = requirePrisma();
    return prisma.auditEvent.create({
      data: {
        organizationId: input.organizationId ?? null,
        sessionId: input.sessionId ?? null,
        actorId: input.actorId ?? null,
        action: input.action,
        targetId: input.targetId ?? null,
        metadata: (input.metadata ?? undefined) as object | undefined,
      },
    });
  },
};
