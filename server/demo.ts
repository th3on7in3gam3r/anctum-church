/**
 * Demo mode: a sample church people can try without creating accounts.
 * Only active when DEMO_MODE=true and DEMO_SECRET is set. Never turn it on for a real church.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { ROLE_PRESETS, baseOrgRoleFor, type RolePreset } from '../shared/churchSetup.ts';
import { forgetEnsuredRoles } from './repositories/setup.ts';

export const DEMO_ORG_SLUG = 'demo-church';

export function isDemoMode(): boolean {
  return process.env.DEMO_MODE === 'true' && (process.env.DEMO_SECRET || '').length >= 16;
}

function sign(userId: string): string {
  return createHmac('sha256', process.env.DEMO_SECRET || '').update(`demo:${userId}`).digest('base64url');
}

export function demoTokenFor(userId: string): string {
  return `demo.${userId}.${sign(userId)}`;
}

/** Returns the user id inside a valid demo token, or null. */
export function userIdFromDemoToken(token: string | null | undefined): string | null {
  if (!isDemoMode() || !token || !token.startsWith('demo.')) return null;
  const [, userId, signature] = token.split('.');
  if (!userId || !signature) return null;
  const expected = Buffer.from(sign(userId));
  const given = Buffer.from(signature);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  return userId;
}

export interface DemoPersona {
  key: string;
  name: string;
  email: string;
  description: string;
}

/** One sign-in per preset role, so buyers can feel the difference between them. */
export const DEMO_PERSONAS: readonly DemoPersona[] = [
  { key: 'super_admin', name: 'Grace Mwangi', email: 'superadmin@demo.church', description: 'Sees and controls everything, including Church setup.' },
  { key: 'developer', name: 'Daniel Otieno', email: 'developer@demo.church', description: 'Sets the church up — features, brand, roles — but can’t see member details.' },
  { key: 'pastor', name: 'Pastor Samuel Okafor', email: 'pastor@demo.church', description: 'Full ministry access. No Church setup.' },
  { key: 'admin', name: 'Ruth Achieng', email: 'admin@demo.church', description: 'Runs the office: people, events, website.' },
  { key: 'secretary', name: 'Esther Nambi', email: 'secretary@demo.church', description: 'Keeps records up to date.' },
  { key: 'moderator', name: 'Joseph Kato', email: 'moderator@demo.church', description: 'Leads prayer rooms and reads requests.' },
  { key: 'ministry_leader', name: 'Mercy Wanjiru', email: 'leader@demo.church', description: 'Leads a group and its events.' },
  { key: 'volunteer', name: 'Peter Mugisha', email: 'volunteer@demo.church', description: 'Sees only what a volunteer needs.' },
];

/** Church members who can sign in to the member area. memberIndex points into the seeded member list. */
export const DEMO_MEMBER_PERSONAS: readonly { key: string; memberIndex: number; email: string; description: string }[] = [
  { key: 'member_sarah', memberIndex: 0, email: 'sarah.member@demo.church', description: 'Leads the worship team. Has a family of three.' },
  { key: 'member_paul', memberIndex: 5, email: 'paul.member@demo.church', description: 'In the youth fellowship, which meets in a live huddle.' },
  { key: 'member_rebecca', memberIndex: 10, email: 'rebecca.member@demo.church', description: 'In the women’s fellowship.' },
];

const GROUP_BLURBS = [
  'Singers and musicians who lead Sunday worship. New voices welcome.',
  'Food, games and Bible study for ages 13–25.',
  'Encouragement, prayer and practical help for women of every age.',
  'The friendly faces who welcome you at the door every Sunday.',
];

const FIRST = ['Sarah', 'David', 'Faith', 'John', 'Mary', 'Paul', 'Joy', 'James', 'Ann', 'Moses', 'Rebecca', 'Isaac', 'Lydia', 'Brian', 'Naomi', 'Victor', 'Agnes', 'Simon', 'Martha', 'Patrick', 'Hope', 'Kevin', 'Diana', 'Allan'];
const LAST = ['Okello', 'Nakato', 'Mutua', 'Achieng', 'Ssempa', 'Wanjiku', 'Banda', 'Mensah'];

/** Wipes and rebuilds the demo church. Leaves every other church alone. */
export async function seedDemoChurch(prisma: PrismaClient): Promise<{ organizationId: string }> {
  const existing = await prisma.organization.findUnique({ where: { slug: DEMO_ORG_SLUG }, select: { id: true } });
  if (existing) {
    await prisma.organization.delete({ where: { id: existing.id } });
    forgetEnsuredRoles(existing.id);
  }
  const org = await prisma.organization.create({
    data: {
      name: 'Grace Fellowship Church',
      slug: DEMO_ORG_SLUG,
      primaryContactName: 'Grace Mwangi',
      primaryContactEmail: 'office@gracefellowship.example',
      appName: 'Church Hub',
      brandTheme: 'forest',
      defaultSermonSpeaker: 'Pastor Samuel Okafor',
      timezone: 'Africa/Nairobi',
      country: 'Kenya',
      phone: '+254 700 123 456',
      website: '/church',
      joinPageMessage: 'Join your church family in prayer.',
    },
  });

  const roles = new Map<string, { id: string; preset: RolePreset }>();
  for (const preset of ROLE_PRESETS) {
    const role = await prisma.churchRole.create({
      data: {
        organizationId: org.id,
        key: preset.key,
        name: preset.name,
        rank: preset.rank,
        canManageSetup: preset.canManageSetup,
        locked: Boolean(preset.locked),
        areas: preset.areas as unknown as Prisma.InputJsonValue,
      },
    });
    roles.set(preset.key, { id: role.id, preset });
  }

  const staffUserIds = new Map<string, string>();
  for (const persona of DEMO_PERSONAS) {
    const user = await prisma.user.upsert({
      where: { email: persona.email },
      update: { name: persona.name },
      create: { email: persona.email, name: persona.name },
    });
    const role = roles.get(persona.key)!;
    await prisma.organizationMembership.create({
      data: {
        organizationId: org.id,
        userId: user.id,
        role: baseOrgRoleFor(role.preset),
        churchRoleId: role.id,
      },
    });
    staffUserIds.set(persona.key, user.id);
  }

  const households = [];
  for (let i = 0; i < 8; i += 1) {
    households.push(
      await prisma.household.create({
        data: { organizationId: org.id, name: `${LAST[i]} family`, phone: `+254 700 ${String(100000 + i * 7919).slice(0, 3)} ${String(200 + i * 37)}` },
      })
    );
  }

  const statuses = ['MEMBER', 'MEMBER', 'MEMBER', 'REGULAR', 'VISITOR'] as const;
  const members = [];
  for (let i = 0; i < FIRST.length; i += 1) {
    const last = LAST[i % LAST.length];
    members.push(
      await prisma.member.create({
        data: {
          organizationId: org.id,
          householdId: households[i % households.length].id,
          firstName: FIRST[i],
          lastName: last,
          phone: `+254 7${String(10 + i).padStart(2, '0')} ${String(300 + i * 13)} ${String(400 + i * 17).slice(0, 3)}`,
          email: `${FIRST[i].toLowerCase()}.${last.toLowerCase()}@example.com`,
          gender: i % 2 === 0 ? 'Female' : 'Male',
          birthMonthDay: `${String((i % 12) + 1).padStart(2, '0')}-${String((i * 3) % 28 + 1).padStart(2, '0')}`,
          status: statuses[i % statuses.length],
          joinedAt: new Date(Date.UTC(2020 + (i % 6), i % 12, 1)),
        },
      })
    );
  }

  for (const persona of DEMO_MEMBER_PERSONAS) {
    const member = members[persona.memberIndex];
    const user = await prisma.user.upsert({
      where: { email: persona.email },
      update: { name: `${member.firstName} ${member.lastName}` },
      create: { email: persona.email, name: `${member.firstName} ${member.lastName}` },
    });
    await prisma.member.update({ where: { id: member.id }, data: { userId: user.id } });
  }

  const groupIds: string[] = [];
  const groupDefs = [
    { name: 'Worship team', type: 'MINISTRY' as const, meetingTime: 'Thursdays, 6:00 p.m.' },
    { name: 'Youth fellowship', type: 'MINISTRY' as const, meetingTime: 'Saturdays, 3:00 p.m.' },
    { name: "Women's fellowship", type: 'CELL' as const, meetingTime: 'Second Saturday, 10:00 a.m.' },
    { name: 'Ushers', type: 'DEPARTMENT' as const, meetingTime: 'Sundays before service' },
  ];
  for (let g = 0; g < groupDefs.length; g += 1) {
    const leader = members[g * 3];
    const group = await prisma.group.create({
      data: {
        organizationId: org.id,
        ...groupDefs[g],
        leaderMemberId: leader.id,
        showOnWebsite: true,
        sortOrder: g,
        publicDescription: GROUP_BLURBS[g],
      },
    });
    groupIds.push(group.id);
    for (let m = 0; m < 5; m += 1) {
      const member = members[(g * 5 + m) % members.length];
      await prisma.groupMember.create({
        data: { groupId: group.id, memberId: member.id, role: member.id === leader.id ? 'LEADER' : 'MEMBER' },
      }).catch(() => undefined);
    }
  }

  const visitors = [
    { name: 'Alice Wairimu', phone: '+254 722 111 222', message: 'We just moved to the area and would like to visit on Sunday.', source: 'PLAN_A_VISIT' as const },
    { name: 'Tom Mensah', phone: '+254 733 222 333', message: 'Please pray for my job interview this week.', source: 'PRAYER' as const },
    { name: 'Beatrice Banda', phone: '+254 744 333 444', message: 'How do I join the choir?', source: 'CONTACT' as const, status: 'CONTACTED' as const },
  ];
  for (const visitor of visitors) {
    await prisma.visitorCard.create({ data: { organizationId: org.id, ...visitor } });
  }

  const day = 24 * 60 * 60 * 1000;
  const now = Date.now();
  // Times are East Africa Time (UTC+3), stored in UTC.
  const nextWeekday = (weekday: number, weeksAhead: number, utcHour: number) => {
    const date = new Date(now);
    date.setUTCHours(utcHour, 0, 0, 0);
    const ahead = (weekday - date.getUTCDay() + 7) % 7 || 7;
    date.setUTCDate(date.getUTCDate() + ahead + weeksAhead * 7);
    return date;
  };
  const events = [
    { title: 'Sunday worship', location: 'Main sanctuary', at: nextWeekday(0, 0, 6), hours: 2 },
    { title: 'Youth fellowship dinner', location: 'Church hall', at: nextWeekday(6, 1, 12), hours: 3, rsvpEnabled: true },
    { title: 'Overnight prayer', location: 'Main sanctuary and online', at: nextWeekday(5, 1, 18), hours: 8 },
  ];
  for (const event of events) {
    const startsAt = event.at;
    await prisma.event.create({
      data: {
        organizationId: org.id,
        title: event.title,
        description: `${event.title} at Grace Fellowship Church.`,
        location: event.location,
        startsAt,
        endsAt: new Date(startsAt.getTime() + event.hours * 60 * 60 * 1000),
        rsvpEnabled: Boolean(event.rsvpEnabled),
      },
    });
  }

  await prisma.announcement.create({
    data: {
      organizationId: org.id,
      title: 'Welcome to the new church app',
      body: 'This is a demo church. Try the menu on the left, and switch roles to see what each person can do.',
      startsAt: new Date(now - day),
      isPinned: true,
    },
  });

  const faqs = [
    { question: 'What time is Sunday service?', answer: 'Sunday worship starts at 9:00 a.m. and 11:30 a.m.' },
    { question: 'Is there something for children?', answer: 'Yes. Children have their own room during both services.' },
  ];
  for (let i = 0; i < faqs.length; i += 1) {
    await prisma.faq.create({ data: { organizationId: org.id, ...faqs[i], sortOrder: i } });
  }
  await prisma.faq.create({ data: { organizationId: org.id, question: 'What should I wear?', answer: 'Come as you are. You will see everything from Sunday best to jeans.', sortOrder: 2 } });
  await prisma.faq.create({ data: { organizationId: org.id, question: 'Where do I park?', answer: 'There is free parking behind the church hall. Ushers will help you on Sunday.', sortOrder: 3 } });
  const leaders = [
    { name: 'Pastor Samuel Okafor', role: 'Senior Pastor', bio: 'Pastor Samuel has led Grace Fellowship for twelve years. He loves the Psalms and a long Sunday lunch.' },
    { name: 'Mama Grace Okafor', role: 'Women’s ministry', bio: 'Grace leads the women’s fellowship and the hospitality team.' },
    { name: 'Joseph Kato', role: 'Prayer ministry', bio: 'Joseph leads the midweek and overnight prayer rooms.' },
    { name: 'Mercy Wanjiru', role: 'Youth & children', bio: 'Mercy runs the youth fellowship and the children’s rooms on Sunday.' },
  ];
  for (let i = 0; i < leaders.length; i += 1) {
    await prisma.leader.create({ data: { organizationId: org.id, ...leaders[i], sortOrder: i } });
  }

  const serviceTimes = [
    { name: 'Sunday worship', cadence: 'WEEKLY', weekday: 'SUNDAY', opens: '09:00', closes: '11:00', startLabel: '9:00 a.m.', endLabel: '11:00 a.m.', place: 'Main sanctuary', note: 'Worship, the Word, and prayer. Children’s rooms open.', showOnHome: true },
    { name: 'Second service', cadence: 'WEEKLY', weekday: 'SUNDAY', opens: '11:30', closes: '13:30', startLabel: '11:30 a.m.', endLabel: '1:30 p.m.', place: 'Main sanctuary', note: null, showOnHome: true },
    { name: 'Midweek prayer', cadence: 'WEEKLY', weekday: 'WEDNESDAY', opens: '18:00', closes: '19:30', startLabel: '6:00 p.m.', endLabel: '7:30 p.m.', place: 'In the hall or live online', note: 'Join from your phone with the prayer link.', showOnHome: true },
    { name: 'Youth fellowship', cadence: 'WEEKLY', weekday: 'SATURDAY', opens: '15:00', closes: '17:00', startLabel: '3:00 p.m.', endLabel: '5:00 p.m.', place: 'Church hall', note: null, showOnHome: false },
  ];
  for (let i = 0; i < serviceTimes.length; i += 1) {
    await prisma.serviceTime.create({ data: { organizationId: org.id, ...serviceTimes[i], sortOrder: i } });
  }

  const sermons = [
    { title: 'Rooted and grounded in love', scripture: 'Ephesians 3:14–21', seriesName: 'Ephesians', weeksAgo: 1 },
    { title: 'The God who sees', scripture: 'Genesis 16:7–13', seriesName: 'Names of God', weeksAgo: 2 },
    { title: 'Bread for the journey', scripture: 'John 6:35–40', seriesName: 'I Am', weeksAgo: 3 },
  ];
  for (const sermon of sermons) {
    await prisma.sermon.create({
      data: {
        organizationId: org.id,
        title: sermon.title,
        speaker: 'Pastor Samuel Okafor',
        scripture: sermon.scripture,
        seriesName: sermon.seriesName,
        preachedOn: new Date(now - sermon.weeksAgo * 7 * day),
        status: 'PUBLISHED',
        isPublished: true,
      },
    });
  }

  const appUrl = (process.env.APP_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000').replace(/\/$/, '');
  const prayerRooms = [
    { name: 'Midweek prayer', slug: 'grace-midweek-prayer', selectedDays: ['Wednesday'], scheduledStart: '06:00 PM', description: 'Pray with the church every Wednesday evening.' },
    { name: 'Morning prayer', slug: 'grace-morning-prayer', selectedDays: ['Monday', 'Tuesday', 'Thursday', 'Friday'], scheduledStart: '06:00 AM', description: 'A short time of prayer before work.' },
  ];
  for (const room of prayerRooms) {
    await prisma.prayerRoom.create({
      data: {
        organizationId: org.id,
        name: room.name,
        slug: room.slug,
        description: room.description,
        isRecurring: true,
        recurrenceRule: 'SELECTED_DAYS',
        selectedDays: room.selectedDays,
        scheduledStart: room.scheduledStart,
        durationMinutes: 60,
        timezone: 'Africa/Nairobi',
        createdById: staffUserIds.get('moderator') ?? null,
        permanentUrl: `${appUrl}/join/${room.slug}`,
      },
    });
  }

  await prisma.prayerRoom.create({
    data: {
      organizationId: org.id,
      name: 'Youth fellowship huddle',
      slug: 'grace-youth-huddle',
      description: 'The youth fellowship meets here when they can’t meet in person.',
      kind: 'HUDDLE',
      groupId: groupIds[1],
      isRecurring: true,
      recurrenceRule: 'SELECTED_DAYS',
      selectedDays: ['Saturday'],
      scheduledStart: '03:00 PM',
      durationMinutes: 90,
      timezone: 'Africa/Nairobi',
      createdById: staffUserIds.get('ministry_leader') ?? null,
      permanentUrl: `${appUrl}/join/grace-youth-huddle`,
    },
  });

  const superAdminId = staffUserIds.get('super_admin');
  if (superAdminId) {
    await prisma.auditEvent.create({
      data: {
        organizationId: org.id,
        actorId: superAdminId,
        action: 'SETUP_BRAND_CHANGED',
        metadata: { summary: 'Set up the demo church' },
      },
    });
  }

  forgetEnsuredRoles(org.id);
  return { organizationId: org.id };
}
