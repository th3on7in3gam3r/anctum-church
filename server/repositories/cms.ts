import type { Prisma } from '@prisma/client';
import { CmsNotFound, DatabaseUnavailable, SanctumError } from '../../shared/errors.ts';
import { hqThumbnail, youtubeId } from '../../shared/youtube.ts';
import { revalidateSite, type SiteTag } from '../cms/revalidateSite.ts';
import { getPrisma } from '../prisma.ts';
import type { PlannedImportRow } from '../cms/phone.ts';

function refreshSite(tag: SiteTag) {
  revalidateSite(tag);
}

function requirePrisma() {
  const prisma = getPrisma();
  if (!prisma) throw DatabaseUnavailable();
  return prisma;
}

function videoColumns(url: string | null | undefined) {
  const youtubeUrl = emptyToNull(url);
  const youtubeVideoId = youtubeId(youtubeUrl);
  return {
    youtubeUrl,
    youtubeVideoId,
    thumbnailUrl: youtubeVideoId ? hqThumbnail(youtubeVideoId) : null,
  };
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002');
}

async function withVideoUniqueness<T>(action: () => Promise<T>) {
  try {
    return await action();
  } catch (error) {
    if (isUniqueConflict(error)) {
      throw new SanctumError('VALIDATION_ERROR', 'That video is already in the sermon list.', 409);
    }
    throw error;
  }
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed ? trimmed : null;
}

function asDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

async function audit(
  action: 'CMS_CREATED' | 'CMS_UPDATED' | 'CMS_DELETED',
  organizationId: string,
  actorId: string | null,
  model: string,
  targetId: string
) {
  const prisma = requirePrisma();
  await prisma.auditEvent.create({
    data: {
      organizationId,
      actorId,
      action,
      targetId,
      metadata: { model },
    },
  });
}

const memberInclude = {
  household: { select: { id: true, name: true } },
  groups: { include: { group: { select: { id: true, name: true, type: true } } } },
} as const;

const groupInclude = {
  leader: { select: { id: true, firstName: true, lastName: true, userId: true } },
  members: { include: { member: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
} as const;

export const cmsRepository = {
  async listHouseholds(organizationId: string) {
    return requirePrisma().household.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' },
      include: { _count: { select: { members: true } } },
    });
  },

  async householdInOrg(organizationId: string, id: string) {
    return requirePrisma().household.findFirst({ where: { id, organizationId } });
  },

  async createHousehold(organizationId: string, actorId: string, input: { name: string; address?: string | null; phone?: string | null }) {
    const prisma = requirePrisma();
    const row = await prisma.household.create({
      data: {
        organizationId,
        name: input.name.trim(),
        address: emptyToNull(input.address),
        phone: emptyToNull(input.phone),
      },
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Household', row.id);
    return row;
  },

  async updateHousehold(
    organizationId: string,
    actorId: string,
    id: string,
    input: { name?: string; address?: string | null; phone?: string | null }
  ) {
    const current = await this.householdInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    const row = await requirePrisma().household.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.address !== undefined ? { address: emptyToNull(input.address) } : {}),
        ...(input.phone !== undefined ? { phone: emptyToNull(input.phone) } : {}),
      },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Household', id);
    return row;
  },

  async deleteHousehold(organizationId: string, actorId: string, id: string) {
    const current = await this.householdInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().household.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Household', id);
  },

  async listMembers(organizationId: string, filters: { q?: string; status?: string; groupId?: string }) {
    const q = filters.q?.trim();
    return requirePrisma().member.findMany({
      where: {
        organizationId,
        ...(filters.status ? { status: filters.status as 'VISITOR' | 'REGULAR' | 'MEMBER' | 'INACTIVE' } : {}),
        ...(filters.groupId ? { groups: { some: { groupId: filters.groupId } } } : {}),
        ...(q
          ? {
              OR: [
                { firstName: { contains: q, mode: 'insensitive' } },
                { lastName: { contains: q, mode: 'insensitive' } },
                { phone: { contains: q } },
                { email: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: memberInclude,
      orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }],
    });
  },

  async memberInOrg(organizationId: string, id: string) {
    return requirePrisma().member.findFirst({ where: { id, organizationId }, include: memberInclude });
  },

  async memberPhones(organizationId: string) {
    const rows = await requirePrisma().member.findMany({
      where: { organizationId },
      select: { phone: true },
    });
    return rows.map((row) => row.phone);
  },

  async createMember(
    organizationId: string,
    actorId: string,
    input: {
      firstName: string;
      lastName: string;
      phone?: string | null;
      email?: string | null;
      gender?: string | null;
      birthMonthDay?: string | null;
      status?: 'VISITOR' | 'REGULAR' | 'MEMBER' | 'INACTIVE';
      joinedAt?: string | null;
      notes?: string | null;
      householdId?: string | null;
      userId?: string | null;
    }
  ) {
    if (input.householdId) {
      const household = await this.householdInOrg(organizationId, input.householdId);
      if (!household) throw CmsNotFound('Household not found');
    }
    const row = await requirePrisma().member.create({
      data: {
        organizationId,
        firstName: input.firstName.trim(),
        lastName: input.lastName.trim(),
        phone: emptyToNull(input.phone),
        email: emptyToNull(input.email),
        gender: emptyToNull(input.gender),
        birthMonthDay: emptyToNull(input.birthMonthDay),
        status: input.status || 'VISITOR',
        joinedAt: asDate(input.joinedAt),
        notes: emptyToNull(input.notes),
        householdId: emptyToNull(input.householdId),
        userId: emptyToNull(input.userId),
      },
      include: memberInclude,
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Member', row.id);
    return row;
  },

  async updateMember(
    organizationId: string,
    actorId: string,
    id: string,
    input: {
      firstName?: string;
      lastName?: string;
      phone?: string | null;
      email?: string | null;
      gender?: string | null;
      birthMonthDay?: string | null;
      status?: 'VISITOR' | 'REGULAR' | 'MEMBER' | 'INACTIVE';
      joinedAt?: string | null;
      notes?: string | null;
      householdId?: string | null;
      userId?: string | null;
    }
  ) {
    const current = await this.memberInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    if (input.householdId) {
      const household = await this.householdInOrg(organizationId, input.householdId);
      if (!household) throw CmsNotFound('Household not found');
    }
    const row = await requirePrisma().member.update({
      where: { id },
      data: {
        ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
        ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
        ...(input.phone !== undefined ? { phone: emptyToNull(input.phone) } : {}),
        ...(input.email !== undefined ? { email: emptyToNull(input.email) } : {}),
        ...(input.gender !== undefined ? { gender: emptyToNull(input.gender) } : {}),
        ...(input.birthMonthDay !== undefined ? { birthMonthDay: emptyToNull(input.birthMonthDay) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.joinedAt !== undefined ? { joinedAt: asDate(input.joinedAt) } : {}),
        ...(input.notes !== undefined ? { notes: emptyToNull(input.notes) } : {}),
        ...(input.householdId !== undefined ? { householdId: emptyToNull(input.householdId) } : {}),
        ...(input.userId !== undefined ? { userId: emptyToNull(input.userId) } : {}),
      },
      include: memberInclude,
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Member', id);
    return row;
  },

  async deleteMember(organizationId: string, actorId: string, id: string) {
    const current = await this.memberInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().member.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Member', id);
  },

  async commitMemberImport(organizationId: string, actorId: string, planned: PlannedImportRow[]) {
    const households = await this.listHouseholds(organizationId);
    const byName = new Map<string, string>();
    for (const household of households) byName.set(household.name.trim().toLowerCase(), household.id);
    const prisma = requirePrisma();
    const inserted = [];
    for (const row of planned) {
      if (row.action !== 'insert') continue;
      const householdId = row.household.trim() ? byName.get(row.household.trim().toLowerCase()) || null : null;
      const member = await prisma.member.create({
        data: {
          organizationId,
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          phone: row.phone.trim() || null,
          email: row.email.trim() || null,
          gender: row.gender.trim() || null,
          status: row.statusValue,
          notes: row.notes.trim() || null,
          householdId,
        },
      });
      inserted.push(member);
      await audit('CMS_CREATED', organizationId, actorId, 'Member', member.id);
    }
    return {
      inserted: inserted.length,
      skipped: planned.filter((row) => row.action !== 'insert').length,
      members: inserted,
    };
  },

  async listGroups(organizationId: string, leaderUserId?: string | null) {
    return requirePrisma().group.findMany({
      where: {
        organizationId,
        ...(leaderUserId ? { leader: { userId: leaderUserId } } : {}),
      },
      include: groupInclude,
      orderBy: { name: 'asc' },
    });
  },

  async groupInOrg(organizationId: string, id: string) {
    return requirePrisma().group.findFirst({ where: { id, organizationId }, include: groupInclude });
  },

  async createGroup(
    organizationId: string,
    actorId: string,
    input: { name: string; type?: 'MINISTRY' | 'CELL' | 'DEPARTMENT' | 'CHOIR' | 'OTHER'; leaderMemberId?: string | null; description?: string | null; showOnWebsite?: boolean; publicDescription?: string | null; meetingTime?: string | null; imageUrl?: string | null; sortOrder?: number }
  ) {
    if (input.leaderMemberId) {
      const leader = await this.memberInOrg(organizationId, input.leaderMemberId);
      if (!leader) throw CmsNotFound('Leader not found');
    }
    const row = await requirePrisma().group.create({
      data: {
        organizationId,
        name: input.name.trim(),
        type: input.type || 'OTHER',
        leaderMemberId: emptyToNull(input.leaderMemberId),
        description: emptyToNull(input.description),
        showOnWebsite: Boolean(input.showOnWebsite),
        publicDescription: emptyToNull(input.publicDescription),
        meetingTime: emptyToNull(input.meetingTime),
        imageUrl: emptyToNull(input.imageUrl),
        sortOrder: input.sortOrder ?? 0,
      },
      include: groupInclude,
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Group', row.id);
    refreshSite('groups');
    return row;
  },

  async updateGroup(
    organizationId: string,
    actorId: string,
    id: string,
    input: { name?: string; type?: 'MINISTRY' | 'CELL' | 'DEPARTMENT' | 'CHOIR' | 'OTHER'; leaderMemberId?: string | null; description?: string | null; showOnWebsite?: boolean; publicDescription?: string | null; meetingTime?: string | null; imageUrl?: string | null; sortOrder?: number }
  ) {
    const current = await this.groupInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    if (input.leaderMemberId) {
      const leader = await this.memberInOrg(organizationId, input.leaderMemberId);
      if (!leader) throw CmsNotFound('Leader not found');
    }
    const row = await requirePrisma().group.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.type !== undefined ? { type: input.type } : {}),
        ...(input.leaderMemberId !== undefined ? { leaderMemberId: emptyToNull(input.leaderMemberId) } : {}),
        ...(input.description !== undefined ? { description: emptyToNull(input.description) } : {}),
        ...(input.showOnWebsite !== undefined ? { showOnWebsite: input.showOnWebsite } : {}),
        ...(input.publicDescription !== undefined ? { publicDescription: emptyToNull(input.publicDescription) } : {}),
        ...(input.meetingTime !== undefined ? { meetingTime: emptyToNull(input.meetingTime) } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: emptyToNull(input.imageUrl) } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
      },
      include: groupInclude,
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Group', id);
    refreshSite('groups');
    return row;
  },

  async deleteGroup(organizationId: string, actorId: string, id: string) {
    const current = await this.groupInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().group.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Group', id);
    refreshSite('groups');
  },

  async addGroupMember(
    organizationId: string,
    actorId: string,
    groupId: string,
    input: { memberId: string; role: 'LEADER' | 'MEMBER' }
  ) {
    const group = await this.groupInOrg(organizationId, groupId);
    if (!group) throw CmsNotFound();
    const member = await this.memberInOrg(organizationId, input.memberId);
    if (!member) throw CmsNotFound('Member not found');
    const row = await requirePrisma().groupMember.upsert({
      where: { groupId_memberId: { groupId, memberId: input.memberId } },
      create: { groupId, memberId: input.memberId, role: input.role },
      update: { role: input.role },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'GroupMember', groupId);
    return row;
  },

  async removeGroupMember(organizationId: string, actorId: string, groupId: string, memberId: string) {
    const group = await this.groupInOrg(organizationId, groupId);
    if (!group) throw CmsNotFound();
    const existing = await requirePrisma().groupMember.findUnique({
      where: { groupId_memberId: { groupId, memberId } },
    });
    if (!existing) throw CmsNotFound();
    await requirePrisma().groupMember.delete({ where: { groupId_memberId: { groupId, memberId } } });
    await audit('CMS_UPDATED', organizationId, actorId, 'GroupMember', groupId);
  },

  async listPages(organizationId: string) {
    return requirePrisma().page.findMany({ where: { organizationId }, orderBy: [{ sortOrder: 'asc' }, { title: 'asc' }] });
  },

  async pageInOrg(organizationId: string, id: string) {
    return requirePrisma().page.findFirst({ where: { id, organizationId } });
  },

  async createPage(
    organizationId: string,
    actorId: string,
    input: { slug: string; title: string; body: Prisma.InputJsonValue; heroImageUrl?: string | null; isPublished?: boolean; sortOrder?: number }
  ) {
    const row = await requirePrisma().page.create({
      data: {
        organizationId,
        slug: input.slug,
        title: input.title.trim(),
        body: input.body,
        heroImageUrl: emptyToNull(input.heroImageUrl),
        isPublished: Boolean(input.isPublished),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Page', row.id);
    refreshSite('pages');
    return row;
  },

  async updatePage(
    organizationId: string,
    actorId: string,
    id: string,
    input: { slug?: string; title?: string; body?: Prisma.InputJsonValue; heroImageUrl?: string | null; isPublished?: boolean; sortOrder?: number }
  ) {
    const current = await this.pageInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    const row = await requirePrisma().page.update({
      where: { id },
      data: {
        ...(input.slug !== undefined ? { slug: input.slug } : {}),
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.body !== undefined ? { body: input.body } : {}),
        ...(input.heroImageUrl !== undefined ? { heroImageUrl: emptyToNull(input.heroImageUrl) } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        isPlaceholder: false,
      },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Page', id);
    refreshSite('pages');
    return row;
  },

  async deletePage(organizationId: string, actorId: string, id: string) {
    const current = await this.pageInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().page.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Page', id);
    refreshSite('pages');
  },

  async listAnnouncements(organizationId: string) {
    return requirePrisma().announcement.findMany({ where: { organizationId }, orderBy: { startsAt: 'desc' } });
  },

  async announcementInOrg(organizationId: string, id: string) {
    return requirePrisma().announcement.findFirst({ where: { id, organizationId } });
  },

  async createAnnouncement(
    organizationId: string,
    actorId: string,
    input: { title: string; body: string; startsAt: string; endsAt?: string | null; isPinned?: boolean }
  ) {
    const row = await requirePrisma().announcement.create({
      data: {
        organizationId,
        title: input.title.trim(),
        body: input.body.trim(),
        startsAt: new Date(input.startsAt),
        endsAt: asDate(input.endsAt),
        isPinned: Boolean(input.isPinned),
      },
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Announcement', row.id);
    refreshSite('announcements');
    return row;
  },

  async updateAnnouncement(
    organizationId: string,
    actorId: string,
    id: string,
    input: { title?: string; body?: string; startsAt?: string; endsAt?: string | null; isPinned?: boolean }
  ) {
    const current = await this.announcementInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    const row = await requirePrisma().announcement.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.body !== undefined ? { body: input.body.trim() } : {}),
        ...(input.startsAt !== undefined ? { startsAt: new Date(input.startsAt) } : {}),
        ...(input.endsAt !== undefined ? { endsAt: asDate(input.endsAt) } : {}),
        ...(input.isPinned !== undefined ? { isPinned: input.isPinned } : {}),
        isPlaceholder: false,
      },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Announcement', id);
    refreshSite('announcements');
    return row;
  },

  async deleteAnnouncement(organizationId: string, actorId: string, id: string) {
    const current = await this.announcementInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().announcement.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Announcement', id);
    refreshSite('announcements');
  },

  async listEvents(organizationId: string) {
    return requirePrisma().event.findMany({
      where: { organizationId },
      orderBy: { startsAt: 'asc' },
      include: { _count: { select: { rsvps: true } }, prayerRoom: { select: { id: true, name: true, slug: true } } },
    });
  },

  async eventInOrg(organizationId: string, id: string) {
    return requirePrisma().event.findFirst({ where: { id, organizationId } });
  },

  async createEvent(
    organizationId: string,
    actorId: string,
    input: { title: string; description?: string; startsAt: string; endsAt: string; location: string; imageUrl?: string | null; rsvpEnabled?: boolean; prayerRoomId?: string | null }
  ) {
    const roomId = emptyToNull(input.prayerRoomId);
    if (roomId) {
      const room = await requirePrisma().prayerRoom.findFirst({ where: { id: roomId, organizationId } });
      if (!room) throw CmsNotFound('Prayer room not found');
    }
    const row = await requirePrisma().event.create({
      data: {
        organizationId,
        title: input.title.trim(),
        description: input.description?.trim() || '',
        startsAt: new Date(input.startsAt),
        endsAt: new Date(input.endsAt),
        location: input.location.trim(),
        imageUrl: emptyToNull(input.imageUrl),
        rsvpEnabled: Boolean(input.rsvpEnabled),
        prayerRoomId: roomId,
      },
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Event', row.id);
    refreshSite('events');
    return row;
  },

  async updateEvent(
    organizationId: string,
    actorId: string,
    id: string,
    input: { title?: string; description?: string; startsAt?: string; endsAt?: string; location?: string; imageUrl?: string | null; rsvpEnabled?: boolean; prayerRoomId?: string | null }
  ) {
    const current = await this.eventInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    if (input.prayerRoomId) {
      const room = await requirePrisma().prayerRoom.findFirst({ where: { id: input.prayerRoomId, organizationId } });
      if (!room) throw CmsNotFound('Prayer room not found');
    }
    const row = await requirePrisma().event.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.description !== undefined ? { description: input.description.trim() } : {}),
        ...(input.startsAt !== undefined ? { startsAt: new Date(input.startsAt) } : {}),
        ...(input.endsAt !== undefined ? { endsAt: new Date(input.endsAt) } : {}),
        ...(input.location !== undefined ? { location: input.location.trim() } : {}),
        ...(input.imageUrl !== undefined ? { imageUrl: emptyToNull(input.imageUrl) } : {}),
        ...(input.rsvpEnabled !== undefined ? { rsvpEnabled: input.rsvpEnabled } : {}),
        ...(input.prayerRoomId !== undefined ? { prayerRoomId: emptyToNull(input.prayerRoomId) } : {}),
        isPlaceholder: false,
      },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Event', id);
    refreshSite('events');
    return row;
  },

  async deleteEvent(organizationId: string, actorId: string, id: string) {
    const current = await this.eventInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().event.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Event', id);
    refreshSite('events');
  },

  async createRsvp(eventId: string, input: { name: string; phone: string; count: number }) {
    return requirePrisma().eventRsvp.create({
      data: { eventId, name: input.name.trim(), phone: input.phone.trim(), count: input.count },
    });
  },

  async listSermons(organizationId: string) {
    return requirePrisma().sermon.findMany({ where: { organizationId }, orderBy: { preachedOn: 'desc' } });
  },

  async sermonInOrg(organizationId: string, id: string) {
    return requirePrisma().sermon.findFirst({ where: { id, organizationId } });
  },

  async createSermon(
    organizationId: string,
    actorId: string,
    input: {
      title: string;
      speaker: string;
      seriesName?: string | null;
      scripture?: string | null;
      preachedOn: string;
      youtubeUrl?: string | null;
      audioUrl?: string | null;
      notes?: string | null;
      isPublished?: boolean;
      sourceTitle?: string | null;
    }
  ) {
    const published = Boolean(input.isPublished);
    const row = await withVideoUniqueness(() => requirePrisma().sermon.create({
      data: {
        organizationId,
        title: input.title.trim(),
        sourceTitle: emptyToNull(input.sourceTitle),
        speaker: input.speaker.trim(),
        seriesName: emptyToNull(input.seriesName),
        scripture: emptyToNull(input.scripture),
        preachedOn: new Date(`${input.preachedOn}T00:00:00.000Z`),
        ...videoColumns(input.youtubeUrl),
        audioUrl: emptyToNull(input.audioUrl),
        notes: emptyToNull(input.notes),
        isPublished: published,
        status: published ? 'PUBLISHED' : 'DRAFT',
      },
    }));
    await audit('CMS_CREATED', organizationId, actorId, 'Sermon', row.id);
    refreshSite('sermons');
    return row;
  },

  async updateSermon(
    organizationId: string,
    actorId: string,
    id: string,
    input: {
      title?: string;
      speaker?: string;
      seriesName?: string | null;
      scripture?: string | null;
      preachedOn?: string;
      youtubeUrl?: string | null;
      audioUrl?: string | null;
      notes?: string | null;
      isPublished?: boolean;
      sourceTitle?: string | null;
    }
  ) {
    const current = await this.sermonInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    const row = await withVideoUniqueness(() => requirePrisma().sermon.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title.trim() } : {}),
        ...(input.sourceTitle !== undefined ? { sourceTitle: emptyToNull(input.sourceTitle) } : {}),
        ...(input.speaker !== undefined ? { speaker: input.speaker.trim() } : {}),
        ...(input.seriesName !== undefined ? { seriesName: emptyToNull(input.seriesName) } : {}),
        ...(input.scripture !== undefined ? { scripture: emptyToNull(input.scripture) } : {}),
        ...(input.preachedOn !== undefined ? { preachedOn: new Date(`${input.preachedOn}T00:00:00.000Z`) } : {}),
        ...(input.youtubeUrl !== undefined ? videoColumns(input.youtubeUrl) : {}),
        ...(input.audioUrl !== undefined ? { audioUrl: emptyToNull(input.audioUrl) } : {}),
        ...(input.notes !== undefined ? { notes: emptyToNull(input.notes) } : {}),
        ...(input.isPublished !== undefined ? { isPublished: input.isPublished, status: input.isPublished ? 'PUBLISHED' as const : 'DRAFT' as const } : {}),
        isPlaceholder: false,
      },
    }));
    await audit('CMS_UPDATED', organizationId, actorId, 'Sermon', id);
    refreshSite('sermons');
    return row;
  },

  async publishSermon(organizationId: string, actorId: string, id: string) {
    const current = await this.sermonInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    if (!current.speaker.trim() || !current.seriesName?.trim() || !current.scripture?.trim()) {
      throw new SanctumError('VALIDATION_ERROR', 'Add a speaker, series, and scripture before publishing.', 400);
    }
    const row = await requirePrisma().sermon.update({
      where: { id },
      data: { isPublished: true, status: 'PUBLISHED', isPlaceholder: false },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Sermon', id);
    refreshSite('sermons');
    return row;
  },

  async ignoreSermon(organizationId: string, actorId: string, id: string) {
    const current = await this.sermonInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    if (current.status === 'PUBLISHED') {
      throw new SanctumError('VALIDATION_ERROR', 'Published messages stay on the site.', 400);
    }
    if (!current.youtubeVideoId) {
      throw new SanctumError('VALIDATION_ERROR', 'Only a YouTube draft can be ignored.', 400);
    }
    const prisma = requirePrisma();
    await prisma.ignoredVideo.upsert({
      where: { organizationId_youtubeVideoId: { organizationId, youtubeVideoId: current.youtubeVideoId } },
      update: { title: current.title },
      create: { organizationId, youtubeVideoId: current.youtubeVideoId, title: current.title },
    });
    await prisma.sermon.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Sermon', id);
    refreshSite('sermons');
  },

  async saveYoutubeChannel(
    organizationId: string,
    input: { youtubeChannelId: string | null; youtubeChannelInput: string | null; defaultSermonSpeaker: string | null; speakerAliases?: string[] }
  ) {
    return requirePrisma().organization.update({
      where: { id: organizationId },
      data: input,
    });
  },

  async deleteSermon(organizationId: string, actorId: string, id: string) {
    const current = await this.sermonInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().sermon.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Sermon', id);
    refreshSite('sermons');
  },

  async listVisitors(organizationId: string) {
    return requirePrisma().visitorCard.findMany({ where: { organizationId }, orderBy: { createdAt: 'desc' } });
  },

  async visitorInOrg(organizationId: string, id: string) {
    return requirePrisma().visitorCard.findFirst({ where: { id, organizationId } });
  },

  async createVisitor(
    organizationId: string,
    input: { name: string; phone: string; email?: string | null; message?: string | null; service?: string | null; source: 'PLAN_A_VISIT' | 'CONTACT' | 'PRAYER' },
    actorId?: string | null
  ) {
    const row = await requirePrisma().visitorCard.create({
      data: {
        organizationId,
        name: input.name.trim(),
        phone: input.phone.trim(),
        email: emptyToNull(input.email),
        message: emptyToNull(input.message),
        service: emptyToNull(input.service),
        source: input.source,
      },
    });
    await audit('CMS_CREATED', organizationId, actorId || null, 'VisitorCard', row.id);
    return row;
  },

  async updateVisitorStatus(organizationId: string, actorId: string, id: string, status: 'NEW' | 'CONTACTED' | 'DONE') {
    const current = await this.visitorInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    const row = await requirePrisma().visitorCard.update({ where: { id }, data: { status } });
    await audit('CMS_UPDATED', organizationId, actorId, 'VisitorCard', id);
    return row;
  },

  async deleteVisitor(organizationId: string, actorId: string, id: string) {
    const current = await this.visitorInOrg(organizationId, id);
    if (!current) throw CmsNotFound();
    await requirePrisma().visitorCard.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'VisitorCard', id);
  },

  async listLeaders(organizationId: string) {
    return requirePrisma().leader.findMany({ where: { organizationId }, orderBy: { sortOrder: 'asc' } });
  },

  async createLeader(
    organizationId: string,
    actorId: string,
    input: { name: string; role: string; photoUrl?: string | null; bio?: string | null; sortOrder?: number }
  ) {
    const row = await requirePrisma().leader.create({
      data: {
        organizationId,
        name: input.name.trim(),
        role: input.role.trim(),
        photoUrl: emptyToNull(input.photoUrl),
        bio: emptyToNull(input.bio),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Leader', row.id);
    refreshSite('leaders');
    return row;
  },

  async updateLeader(
    organizationId: string,
    actorId: string,
    id: string,
    input: { name?: string; role?: string; photoUrl?: string | null; bio?: string | null; sortOrder?: number }
  ) {
    const current = await requirePrisma().leader.findFirst({ where: { id, organizationId } });
    if (!current) throw CmsNotFound();
    const row = await requirePrisma().leader.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name.trim() } : {}),
        ...(input.role !== undefined ? { role: input.role.trim() } : {}),
        ...(input.photoUrl !== undefined ? { photoUrl: emptyToNull(input.photoUrl) } : {}),
        ...(input.bio !== undefined ? { bio: emptyToNull(input.bio) } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        isPlaceholder: false,
      },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Leader', id);
    refreshSite('leaders');
    return row;
  },

  async deleteLeader(organizationId: string, actorId: string, id: string) {
    const current = await requirePrisma().leader.findFirst({ where: { id, organizationId } });
    if (!current) throw CmsNotFound();
    await requirePrisma().leader.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Leader', id);
    refreshSite('leaders');
  },

  async listFaqs(organizationId: string) {
    return requirePrisma().faq.findMany({ where: { organizationId }, orderBy: { sortOrder: 'asc' } });
  },

  async createFaq(
    organizationId: string,
    actorId: string,
    input: { question: string; answer: string; sortOrder?: number }
  ) {
    const row = await requirePrisma().faq.create({
      data: {
        organizationId,
        question: input.question.trim(),
        answer: input.answer.trim(),
        sortOrder: input.sortOrder ?? 0,
      },
    });
    await audit('CMS_CREATED', organizationId, actorId, 'Faq', row.id);
    refreshSite('faqs');
    return row;
  },

  async updateFaq(
    organizationId: string,
    actorId: string,
    id: string,
    input: { question?: string; answer?: string; sortOrder?: number }
  ) {
    const current = await requirePrisma().faq.findFirst({ where: { id, organizationId } });
    if (!current) throw CmsNotFound();
    const row = await requirePrisma().faq.update({
      where: { id },
      data: {
        ...(input.question !== undefined ? { question: input.question.trim() } : {}),
        ...(input.answer !== undefined ? { answer: input.answer.trim() } : {}),
        ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
        isPlaceholder: false,
      },
    });
    await audit('CMS_UPDATED', organizationId, actorId, 'Faq', id);
    refreshSite('faqs');
    return row;
  },

  async deleteFaq(organizationId: string, actorId: string, id: string) {
    const current = await requirePrisma().faq.findFirst({ where: { id, organizationId } });
    if (!current) throw CmsNotFound();
    await requirePrisma().faq.delete({ where: { id } });
    await audit('CMS_DELETED', organizationId, actorId, 'Faq', id);
    refreshSite('faqs');
  },
};
