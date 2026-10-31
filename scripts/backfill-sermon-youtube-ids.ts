import 'dotenv/config';
import { hqThumbnail, youtubeId } from '../shared/youtube.ts';
import { getPrisma } from '../server/prisma.ts';

const prisma = getPrisma();
if (!prisma) throw new Error('DATABASE_URL is not configured');

async function main() {
  const sermons = await prisma.sermon.findMany({
    select: { id: true, organizationId: true, title: true, youtubeUrl: true, youtubeVideoId: true },
  });
  const seen = new Map<string, { id: string; title: string }>();

  for (const sermon of sermons) {
    const videoId = sermon.youtubeVideoId || youtubeId(sermon.youtubeUrl);
    if (!videoId) continue;
    const key = `${sermon.organizationId}:${videoId}`;
    const previous = seen.get(key);
    if (previous) {
      throw new Error(
        `Two sermons in one church parse to the same YouTube video (${videoId}): "${previous.title}" (${previous.id}) and "${sermon.title}" (${sermon.id}). The unique index was not added.`
      );
    }
    seen.set(key, { id: sermon.id, title: sermon.title });
    if (sermon.youtubeVideoId !== videoId) {
      await prisma.sermon.update({
        where: { id: sermon.id },
        data: { youtubeVideoId: videoId, thumbnailUrl: hqThumbnail(videoId) },
      });
    }
  }

  await prisma.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "Sermon_organizationId_youtubeVideoId_key" ON "Sermon"("organizationId", "youtubeVideoId")'
  );
  console.log(`Backfilled ${seen.size} sermon video ids and added the unique index.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
