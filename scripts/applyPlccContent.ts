// Logo is owned by packages/brand. Imports never touch the logo.
import type { PrismaClient } from '@prisma/client';
import { youtubeId, hqThumbnail } from '../shared/youtube.ts';
import {
  aboutPageBody,
  faithSermon,
  faqs,
  homePageBody,
  leadershipPageBody,
  leaders,
  retiredPlaceholderEvents,
  retiredPlaceholderLeaders,
  serviceTimes,
  youtubeChannel,
} from '../shared/plccContent.ts';

const pages = [
  { slug: 'home', title: 'Promised Land Christian Center', sortOrder: 0, body: homePageBody, isPlaceholder: false },
  { slug: 'about', title: 'About', sortOrder: 1, body: aboutPageBody, isPlaceholder: true },
  { slug: 'leadership', title: 'Leadership', sortOrder: 2, body: leadershipPageBody, isPlaceholder: true },
];

export async function applyPlccContent(prisma: PrismaClient, organizationId: string) {
  for (const time of serviceTimes) {
    await prisma.serviceTime.upsert({
      where: { organizationId_name: { organizationId, name: time.name } },
      create: { organizationId, ...time },
      update: { ...time },
    });
  }

  for (const page of pages) {
    const existing = await prisma.page.findFirst({ where: { organizationId, slug: page.slug } });
    const data = {
      title: page.title,
      body: page.body,
      isPublished: true,
      isPlaceholder: page.isPlaceholder,
      sortOrder: page.sortOrder,
    };
    if (existing) await prisma.page.update({ where: { id: existing.id }, data });
    else await prisma.page.create({ data: { organizationId, slug: page.slug, ...data } });
  }

  const questions = new Set(faqs.map((faq) => faq.question));
  const currentFaqs = await prisma.faq.findMany({ where: { organizationId } });
  for (const faq of currentFaqs) {
    if (faq.isPlaceholder && !questions.has(faq.question)) {
      await prisma.faq.delete({ where: { id: faq.id } });
    }
  }
  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({ where: { organizationId, question: faq.question } });
    const data = { ...faq, isPlaceholder: false };
    if (existing) await prisma.faq.update({ where: { id: existing.id }, data });
    else await prisma.faq.create({ data: { organizationId, ...data } });
  }

  for (const leader of leaders) {
    const existing = await prisma.leader.findFirst({
      where: { organizationId, name: { in: [leader.name, ...leader.also] } },
    });
    const data = {
      name: leader.name,
      role: leader.role,
      bio: leader.bio,
      sortOrder: leader.sortOrder,
      isPlaceholder: leader.isPlaceholder,
    };
    if (existing) await prisma.leader.update({ where: { id: existing.id }, data });
    else await prisma.leader.create({ data: { organizationId, ...data } });
  }
  await prisma.leader.deleteMany({
    where: { organizationId, name: { in: retiredPlaceholderLeaders }, isPlaceholder: true },
  });

  await prisma.event.deleteMany({
    where: { organizationId, title: { in: [...retiredPlaceholderEvents] }, isPlaceholder: true },
  });

  const announcement = await prisma.announcement.findFirst({
    where: { organizationId, title: { in: ['Welcome to Promised Land', '[PLACEHOLDER] Welcome to Promised Land'] } },
  });
  const announcementData = {
    title: 'Welcome to Promised Land',
    body: 'You are welcome on Sunday. The service is 10:00 a.m. to 12:30 p.m. at the church building. New members and new believers meet at 9:00 a.m.',
    isPinned: true,
    isPlaceholder: false,
  };
  if (announcement) await prisma.announcement.update({ where: { id: announcement.id }, data: announcementData });
  else {
    await prisma.announcement.create({
      data: { organizationId, ...announcementData, startsAt: new Date('2026-10-01T00:00:00+03:00') },
    });
  }

  const videoId = youtubeId(faithSermon.youtubeUrl);
  const existingSermon = videoId
    ? await prisma.sermon.findFirst({ where: { organizationId, youtubeVideoId: videoId } })
    : null;
  if (!existingSermon && videoId) {
    await prisma.sermon.create({
      data: {
        organizationId,
        title: faithSermon.title,
        speaker: faithSermon.speaker,
        scripture: faithSermon.scripture,
        preachedOn: new Date(`${faithSermon.preachedOn}T00:00:00.000Z`),
        notes: faithSermon.notes,
        youtubeUrl: faithSermon.youtubeUrl,
        youtubeVideoId: videoId,
        thumbnailUrl: hqThumbnail(videoId),
        isPublished: true,
        status: 'PUBLISHED',
        isPlaceholder: false,
      },
    });
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { youtubeChannelInput: youtubeChannel },
  });

  const children = await prisma.group.findFirst({ where: { organizationId, name: 'Children' } });
  if (children) {
    await prisma.group.update({
      where: { id: children.id },
      data: { meetingTime: 'During Sunday service, 10:00 a.m.–12:30 p.m.' },
    });
  }
  const outreach = await prisma.group.findFirst({ where: { organizationId, name: 'Outreach' } });
  if (outreach) {
    await prisma.group.update({
      where: { id: outreach.id },
      data: { meetingTime: 'Wednesday, 1:00–2:00 p.m.' },
    });
  }
}
