import { SEED_MEMBERSHIPS, SEED_ORG_ID } from './seedMemberships.ts';
import { getPrisma } from '../server/prisma.ts';

const prisma = getPrisma();
if (!prisma) throw new Error('DATABASE_URL is not configured');
const ORG_ID = SEED_ORG_ID;

async function main() {
  await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: {
      name: 'Promised Land Christian Center',
      slug: 'promised-land-christian-center',
      primaryContactName: 'Pastor GraceLove Hiire',
      defaultSermonSpeaker: 'Pastor GraceLove Hiire',
    },
    create: {
      id: ORG_ID,
      name: 'Promised Land Christian Center',
      slug: 'promised-land-christian-center',
      country: 'Uganda',
      timezone: 'Africa/Kampala',
      primaryContactName: 'Pastor GraceLove Hiire',
      primaryContactEmail: 'promisedlandchc@gmail.com',
      phone: '+256 744 836 784',
      defaultSermonSpeaker: 'Pastor GraceLove Hiire',
      joinPageMessage: 'Welcome to Promised Land Christian Center. Join your church family in prayer.',
    },
  });

  for (const user of SEED_MEMBERSHIPS) {
    await prisma.user.upsert({
      where: { id: user.id },
      update: { name: user.name, email: user.email },
      create: { id: user.id, name: user.name, email: user.email },
    });
    await prisma.organizationMembership.upsert({
      where: { organizationId_userId: { organizationId: ORG_ID, userId: user.id } },
      update: { role: user.role, status: 'ACTIVE' },
      create: {
        organizationId: ORG_ID,
        userId: user.id,
        role: user.role,
        status: 'ACTIVE',
      },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
