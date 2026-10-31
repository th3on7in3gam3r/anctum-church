import { getPrisma } from '../server/prisma.ts';

const prisma = getPrisma();
if (!prisma) throw new Error('DATABASE_URL is not configured');

const organization = await prisma.organization.upsert({
  where: { slug: 'promised-land-christian-center' },
  update: {
    name: 'Promised Land Christian Center',
    defaultSermonSpeaker: 'Pastor GraceLove Hiire',
  },
  create: {
    name: 'Promised Land Christian Center',
    slug: 'promised-land-christian-center',
    primaryContactName: 'Office',
    primaryContactEmail: 'office@example.org',
    defaultSermonSpeaker: 'Pastor GraceLove Hiire',
  },
});

await prisma.prayerRoom.upsert({
  where: { organizationId_slug: { organizationId: organization.id, slug: 'promised-land-christian-center' } },
  update: {
    name: 'Promised Land Christian Center',
    allowGuests: true,
    passcodeHash: null,
  },
  create: {
    organizationId: organization.id,
    name: 'Promised Land Christian Center',
    slug: 'promised-land-christian-center',
    permanentUrl: '/join/promised-land-christian-center',
    allowGuests: true,
    isRecurring: true,
    recurrenceRule: 'DAILY',
    scheduledStart: '05:00 AM',
    timezone: 'Africa/Kampala',
  },
});

console.log('Contrast room is ready');
await prisma.$disconnect();
