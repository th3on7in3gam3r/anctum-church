import 'dotenv/config';
import { getPrisma } from '../server/prisma.ts';

const deployed = process.env.DEPLOY_ENV === 'staging' || process.env.DEPLOY_ENV === 'production';
if (!deployed) {
  process.exit(0);
}

if (process.env.DEPLOY_ENV === 'production' && process.env.ALLOW_PLACEHOLDER === 'true') {
  console.error('ALLOW_PLACEHOLDER cannot be set when DEPLOY_ENV=production.');
  process.exit(1);
}

if (process.env.ALLOW_PLACEHOLDER === 'true') {
  console.log('ALLOW_PLACEHOLDER is set. Sample church content will not block this build.');
  process.exit(0);
}

const prisma = getPrisma();
if (!prisma) throw new Error('DATABASE_URL is not configured');

try {
  const [pages, sermons, announcements, events, leaders, faqs] = await Promise.all([
    prisma.page.count({ where: { isPublished: true, isPlaceholder: true } }),
    prisma.sermon.count({ where: { isPlaceholder: true, OR: [{ isPublished: true }, { status: 'PUBLISHED' }] } }),
    prisma.announcement.count({ where: { isPlaceholder: true } }),
    prisma.event.count({ where: { isPlaceholder: true } }),
    prisma.leader.count({ where: { isPlaceholder: true } }),
    prisma.faq.count({ where: { isPlaceholder: true } }),
  ]);

  const total = pages + sermons + announcements + events + leaders + faqs;
  if (total > 0) {
    console.error(
      `Sample church content is still published (${pages} pages, ${announcements} announcements, ${events} events, ${sermons} sermons, ${leaders} leaders, ${faqs} faqs). Replace it before a production build. Staging may set ALLOW_PLACEHOLDER=true.`
    );
    process.exitCode = 1;
  }
} finally {
  await prisma.$disconnect();
}
