import 'dotenv/config';
import type { Prisma } from '@prisma/client';
import { kampalaDay, youtubeId, hqThumbnail } from '../shared/youtube.ts';
import { lookupYoutube } from '../server/youtube/lookup.ts';
import { getPrisma } from '../server/prisma.ts';
import { applyPlccContent } from './applyPlccContent.ts';

const prisma = getPrisma();
if (!prisma) throw new Error('DATABASE_URL is not configured');
const ORG_SLUG = 'promised-land-christian-center';

const pages: Array<{ slug: string; title: string; sortOrder: number; body: Prisma.InputJsonValue }> = [
  {
    slug: 'home',
    title: 'Promised Land Christian Center',
    sortOrder: 0,
    body: [
      { type: 'paragraph', text: 'Changing Hearts. Transforming Lives.' },
      {
        type: 'scripture',
        reference: 'Jeremiah 29:11',
        text: 'For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, plans to give you hope and a future.',
      },
      { type: 'heading', text: 'A word from our pastor', level: 2 },
      { type: 'paragraph', text: 'You belong in this house. Come as you are, and let this church family walk with you in worship, the Word, and prayer. Nobody here is meant to carry life alone.' },
      { type: 'heading', text: 'Service times', level: 2 },
      { type: 'paragraph', text: 'Sunday\n9:00 a.m. and 11:30 a.m.\nSunday worship\nWorship, the Word, and prayer.' },
      { type: 'paragraph', text: 'Wednesday\n6:00 p.m.\nMidweek prayer\nAn evening to pray for Kampala.' },
      { type: 'paragraph', text: 'Friday\n7:00 p.m.\nNight prayer\nA quiet hour before the weekend.' },
      { type: 'heading', text: 'Plan a visit', level: 2 },
      { type: 'paragraph', text: 'Arrive a little early. A host will help you find a seat.' },
      { type: 'paragraph', text: 'Children are welcome. Ask, and we will walk you to them.' },
      { type: 'paragraph', text: 'Stay after the service. Someone will be glad to meet you.' },
    ],
  },
  {
    slug: 'about',
    title: 'About',
    sortOrder: 1,
    body: [
      { type: 'paragraph', text: 'Promised Land Christian Center is a church family in Kampala. We worship Jesus, open the Scriptures, and pray for our city. Come as you are. There is a place for you in the house.' },
      { type: 'heading', text: 'Mission', level: 2 },
      { type: 'paragraph', text: 'To know Jesus and make him known in Kampala, one household at a time.' },
      { type: 'heading', text: 'Vision', level: 2 },
      { type: 'paragraph', text: 'A church where people are changed, and the city feels the difference.' },
      { type: 'heading', text: 'Story', level: 2 },
      { type: 'paragraph', text: 'We gather as a Pentecostal family: worship, the Word, and prayer, with room for whoever walks in.' },
    ],
  },
  {
    slug: 'leadership',
    title: 'Leadership',
    sortOrder: 2,
    body: [
      { type: 'heading', text: 'Pastors', level: 2 },
      { type: 'paragraph', text: 'Pastor GraceLove Hiire serves as Senior Pastor. The pastoral team prays, opens the Scriptures, and cares for families across Kampala.' },
    ],
  },
  {
    slug: 'ministries',
    title: 'Ministries',
    sortOrder: 3,
    body: [
      { type: 'paragraph', text: 'Children, youth, worship, and outreach meet through the week. Ask a host on Sunday and they will walk you to the ministry that fits your family.' },
    ],
  },
  {
    slug: 'beliefs',
    title: 'What we believe',
    sortOrder: 4,
    body: [
      { type: 'paragraph', text: 'We believe the Bible is the word of God, and that Jesus Christ is Lord and Saviour.' },
      { type: 'heading', text: 'The Scriptures', level: 2 },
      { type: 'paragraph', text: 'The Bible is the word of God, trustworthy and sufficient.' },
      { type: 'heading', text: 'Jesus Christ', level: 2 },
      { type: 'paragraph', text: 'Jesus is Lord and Saviour, fully God and fully man.' },
      { type: 'heading', text: 'The Holy Spirit', level: 2 },
      { type: 'paragraph', text: 'The Spirit gives power for holy life, prayer, and witness.' },
      { type: 'heading', text: 'The Church', level: 2 },
      { type: 'paragraph', text: 'The church is the family of Jesus, sent with the hope of his return.' },
    ],
  },
  {
    slug: 'give',
    title: 'Give',
    sortOrder: 5,
    body: [
      { type: 'paragraph', text: 'Your giving carries the worship, the care of families, and the outreach of Promised Land Christian Center in Kampala. The church office will publish bank and mobile-money details here.' },
    ],
  },
];

const events = [
  {
    title: 'Sunday worship',
    legacyTitle: '[PLACEHOLDER] Sunday worship',
    description: 'Two morning services of worship, the Word, and prayer. Children are welcome.',
    startsAt: new Date('2026-11-08T09:00:00+03:00'),
    endsAt: new Date('2026-11-08T12:00:00+03:00'),
    location: 'Sanctuary, Kampala',
  },
  {
    title: 'Community prayer night',
    legacyTitle: '[PLACEHOLDER] Community prayer night',
    description: 'An evening to pray for Kampala, our families, and the nations.',
    startsAt: new Date('2026-11-18T18:00:00+03:00'),
    endsAt: new Date('2026-11-18T20:00:00+03:00'),
    location: 'Sanctuary, Kampala',
  },
  {
    title: 'Youth gathering',
    legacyTitle: '[PLACEHOLDER] Youth gathering',
    description: 'Worship and the Word for young people, with room to bring a friend.',
    startsAt: new Date('2026-12-05T16:00:00+03:00'),
    endsAt: new Date('2026-12-05T18:30:00+03:00'),
    location: 'Youth hall, Kampala',
  },
];

const sermons = [
  {
    title: 'Hope for the city',
    legacyTitle: '[PLACEHOLDER] Hope for the city',
    speaker: 'Pastor GraceLove Hiire',
    seriesName: 'Faith',
    scripture: 'Jeremiah 29:11',
    preachedOn: new Date('2026-10-04T00:00:00.000Z'),
    notes: 'God has not forgotten Kampala. This message traces the promise of a future and a hope, and calls the church to pray for the city where we live.',
    youtubeUrl: 'https://www.youtube.com/watch?v=_sYcvbeK6f8',
  },
  {
    title: 'Walking in grace',
    legacyTitle: '[PLACEHOLDER] Walking in grace',
    speaker: 'Pastor GraceLove Hiire',
    seriesName: 'Faith',
    scripture: 'Ephesians 2:8',
    preachedOn: new Date('2026-09-27T00:00:00.000Z'),
    notes: 'Salvation is the gift of God. This message invites us to stop striving for what Christ has already finished, and to walk freely in his grace.',
    youtubeUrl: 'https://www.youtube.com/watch?v=ZRZ7k2R679E',
  },
  {
    title: 'The promise of God',
    legacyTitle: '[PLACEHOLDER] The promise of God',
    speaker: 'Pastor GraceLove Hiire',
    seriesName: 'Promise',
    scripture: 'Genesis 12:1',
    preachedOn: new Date('2026-09-20T00:00:00.000Z'),
    notes: 'Abraham left what he knew because God spoke. This message asks us to trust the God who calls, provides, and keeps his word.',
    youtubeUrl: 'https://www.youtube.com/watch?v=jfL3aFovzzQ',
  },
  {
    title: 'The power of faith',
    legacyTitle: 'The power of faith',
    speaker: 'Pastor GraceLove Hiire',
    seriesName: 'Faith',
    scripture: 'Matthew 17:20',
    preachedOn: new Date('2025-09-11T00:00:00.000Z'),
    notes: 'Faith the size of a seed is enough when it rests on God. This message calls the church to trust him with what looks immovable.',
    youtubeUrl: 'https://www.youtube.com/watch?v=Y7xXUUMZJHg',
  },
];

const announcement = {
  title: 'Welcome to Promised Land',
  legacyTitle: '[PLACEHOLDER] Welcome to Promised Land',
  body: 'You are welcome this Sunday. Come for worship at 9:00 a.m. or 11:30 a.m., and stay afterwards. Someone will be glad to meet you.',
};

async function main() {
  const organization = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!organization) {
    throw new Error(`No organization with slug ${ORG_SLUG}. Create the church space first.`);
  }

  for (const page of pages) {
    const existing = await prisma.page.findFirst({ where: { organizationId: organization.id, slug: page.slug } });
    if (existing && !existing.isPlaceholder) continue;
    const data = {
      title: page.title,
      body: page.body,
      isPublished: true,
      isPlaceholder: true,
      sortOrder: page.sortOrder,
    };
    if (existing) {
      await prisma.page.update({ where: { id: existing.id }, data });
    } else {
      await prisma.page.create({ data: { organizationId: organization.id, slug: page.slug, ...data } });
    }
  }

  for (const event of events) {
    const existing = await prisma.event.findFirst({
      where: { organizationId: organization.id, title: { in: [event.title, event.legacyTitle] } },
    });
    if (existing && !existing.isPlaceholder) continue;
    const data = {
      title: event.title,
      description: event.description,
      startsAt: event.startsAt,
      endsAt: event.endsAt,
      location: event.location,
      rsvpEnabled: true,
      isPlaceholder: true,
    };
    if (existing) {
      await prisma.event.update({ where: { id: existing.id }, data });
    } else {
      await prisma.event.create({ data: { organizationId: organization.id, ...data } });
    }
  }

  for (const sermon of sermons) {
    const existing = await prisma.sermon.findFirst({
      where: {
        organizationId: organization.id,
        OR: [
          { title: { in: [sermon.title, sermon.legacyTitle] } },
          { youtubeUrl: sermon.youtubeUrl },
        ],
      },
    });
    if (existing && !existing.isPlaceholder) continue;
    let title = sermon.title;
    let preachedOn = sermon.preachedOn;
    let thumbnailUrl = hqThumbnail(youtubeId(sermon.youtubeUrl) || '');
    try {
      const meta = await lookupYoutube(sermon.youtubeUrl);
      title = meta.title;
      thumbnailUrl = meta.thumbnailUrl;
      const page = await fetch(sermon.youtubeUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { 'user-agent': 'Mozilla/5.0' },
      });
      const html = await page.text();
      const uploaded = html.match(/itemprop="(?:datePublished|uploadDate)" content="(\d{4}-\d{2}-\d{2})/)?.[1]
        || html.match(/"(?:uploadDate|publishDate|datePublished)":"(\d{4}-\d{2}-\d{2})/)?.[1];
      if (uploaded) preachedOn = new Date(`${kampalaDay(`${uploaded}T12:00:00.000Z`)}T00:00:00.000Z`);
    } catch (error) {
      console.error(`YouTube metadata for ${sermon.youtubeUrl}: ${error instanceof Error ? error.message : error}`);
    }
    const data = {
      title,
      speaker: sermon.speaker,
      seriesName: sermon.seriesName,
      scripture: null,
      preachedOn,
      notes: sermon.notes,
      youtubeUrl: sermon.youtubeUrl,
      youtubeVideoId: youtubeId(sermon.youtubeUrl),
      thumbnailUrl,
      isPublished: true,
      status: 'PUBLISHED' as const,
      isPlaceholder: true,
    };
    if (existing) {
      await prisma.sermon.update({ where: { id: existing.id }, data });
    } else {
      await prisma.sermon.create({ data: { organizationId: organization.id, ...data } });
    }
  }

  const existingAnnouncement = await prisma.announcement.findFirst({
    where: { organizationId: organization.id, title: { in: [announcement.title, announcement.legacyTitle] } },
  });
  if (!existingAnnouncement || existingAnnouncement.isPlaceholder) {
    const data = {
      title: announcement.title,
      body: announcement.body,
      startsAt: new Date('2026-10-01T00:00:00+03:00'),
      isPinned: true,
      isPlaceholder: true,
    };
    if (existingAnnouncement) {
      await prisma.announcement.update({ where: { id: existingAnnouncement.id }, data });
    } else {
      await prisma.announcement.create({ data: { organizationId: organization.id, ...data } });
    }
  }

  const leaders = [
    { name: 'Pastor GraceLove Hiire', role: 'Senior Pastor', bio: 'Pastor GraceLove Hiire serves Promised Land Christian Center, opening the Scriptures and walking with families across Kampala.', sortOrder: 0 },
    { name: 'Worship team', role: 'Worship', bio: 'The worship team leads the church in song on Sunday and through the week.', sortOrder: 1 },
    { name: 'Children ministry', role: 'Children', bio: 'Hosts welcome children and walk families to the right room.', sortOrder: 2 },
  ];
  for (const leader of leaders) {
    const existing = await prisma.leader.findFirst({ where: { organizationId: organization.id, name: leader.name } });
    if (existing) continue;
    await prisma.leader.create({ data: { organizationId: organization.id, ...leader, isPlaceholder: true } });
  }

  const ministries = [
    { name: 'Children', publicDescription: 'A safe room for children during the services, with Bible stories and song.', meetingTime: 'Sundays, both services', sortOrder: 0 },
    { name: 'Youth', publicDescription: 'Worship and the Word for young people, with room to bring a friend.', meetingTime: 'Saturday afternoon', sortOrder: 1 },
    { name: 'Worship', publicDescription: 'Singers and musicians who lead the church in praise.', meetingTime: 'Rehearsal, Saturday evening', sortOrder: 2 },
    { name: 'Outreach', publicDescription: 'Prayer and practical care for neighbours in Kampala.', meetingTime: 'Ask a host on Sunday', sortOrder: 3 },
  ];
  for (const ministry of ministries) {
    const existing = await prisma.group.findFirst({ where: { organizationId: organization.id, name: ministry.name } });
    if (existing) continue;
    await prisma.group.create({
      data: {
        organizationId: organization.id,
        name: ministry.name,
        type: 'MINISTRY',
        showOnWebsite: true,
        publicDescription: ministry.publicDescription,
        meetingTime: ministry.meetingTime,
        sortOrder: ministry.sortOrder,
      },
    });
  }

  const faqs = [
    { question: 'What should I wear?', answer: 'Come as you are. You will see everything from Sunday best to simple clothes.', sortOrder: 0 },
    { question: 'Where do I park?', answer: 'Ask a host as you arrive. They will point you to a place and walk you in.', sortOrder: 1 },
    { question: 'Can I bring my children?', answer: 'Yes. Children are welcome, and a host can walk you to them.', sortOrder: 2 },
  ];
  for (const faq of faqs) {
    const existing = await prisma.faq.findFirst({ where: { organizationId: organization.id, question: faq.question } });
    if (existing) continue;
    await prisma.faq.create({ data: { organizationId: organization.id, ...faq, isPlaceholder: true } });
  }

  const contact: { phone?: string; primaryContactEmail?: string } = {};
  await applyPlccContent(prisma, organization.id);

  if (!organization.phone?.trim()) contact.phone = '+256744836784';
  if (!organization.primaryContactEmail?.trim()) contact.primaryContactEmail = 'promisedlandchc@gmail.com';
  if (contact.phone || contact.primaryContactEmail) {
    await prisma.organization.update({ where: { id: organization.id }, data: contact });
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
