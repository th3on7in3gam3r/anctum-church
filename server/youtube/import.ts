import { DatabaseUnavailable, SanctumError } from '../../shared/errors.ts';
import { hqThumbnail, kampalaDay, parseSermonTitle } from '../../shared/youtube.ts';
import { getPrisma } from '../prisma.ts';
import { fetchChannelFeed, type FeedEntry } from './channel.ts';

function requirePrisma() {
  const prisma = getPrisma();
  if (!prisma) throw DatabaseUnavailable();
  return prisma;
}

const FALLBACK_SPEAKER = '';

export function selectNewUploads(input: {
  entries: FeedEntry[];
  existingVideoIds: Iterable<string>;
  ignoredVideoIds: Iterable<string>;
  now?: Date;
}) {
  const now = input.now ?? new Date();
  const existing = new Set(input.existingVideoIds);
  const ignored = new Set(input.ignoredVideoIds);
  return input.entries.filter((entry) => {
    const published = new Date(entry.publishedAt);
    if (Number.isNaN(published.getTime()) || published.getTime() > now.getTime()) return false;
    if (existing.has(entry.videoId) || ignored.has(entry.videoId)) return false;
    return true;
  });
}

function isUniqueConflict(error: unknown) {
  return Boolean(error && typeof error === 'object' && 'code' in error && (error as { code: string }).code === 'P2002');
}

export async function importYoutubeChannels(organizationId?: string) {
  const prisma = requirePrisma();
  const organizations = await prisma.organization.findMany({
    where: {
      youtubeChannelId: { not: null },
      ...(organizationId ? { id: organizationId } : {}),
    },
    select: { id: true, youtubeChannelId: true, defaultSermonSpeaker: true, speakerAliases: true },
  });

  let created = 0;
  for (const organization of organizations) {
    if (!organization.youtubeChannelId) continue;
    const feed = await fetchChannelFeed(organization.youtubeChannelId);
    const [sermons, ignored, namedSeries] = await Promise.all([
      prisma.sermon.findMany({
        where: { organizationId: organization.id, youtubeVideoId: { not: null } },
        select: { youtubeVideoId: true },
      }),
      prisma.ignoredVideo.findMany({
        where: { organizationId: organization.id },
        select: { youtubeVideoId: true },
      }),
      prisma.sermon.findMany({
        where: { organizationId: organization.id, seriesName: { not: null } },
        select: { seriesName: true },
        distinct: ['seriesName'],
      }),
    ]);
    const fresh = selectNewUploads({
      entries: feed.entries,
      existingVideoIds: sermons.map((row) => row.youtubeVideoId || ''),
      ignoredVideoIds: ignored.map((row) => row.youtubeVideoId),
    });
    const fallbackSpeaker = organization.defaultSermonSpeaker?.trim() || FALLBACK_SPEAKER;
    const knownSpeakers = {
      defaultSpeaker: organization.defaultSermonSpeaker,
      aliases: organization.speakerAliases,
    };
    const series = namedSeries.flatMap((row) => (row.seriesName ? [row.seriesName] : []));
    for (const entry of fresh) {
      const parsed = parseSermonTitle(entry.title, knownSpeakers, series);
      try {
        await prisma.sermon.create({
          data: {
            organizationId: organization.id,
            title: parsed.title,
            sourceTitle: entry.title,
            speaker: parsed.speaker || fallbackSpeaker,
            seriesName: parsed.seriesName,
            scripture: parsed.scripture,
            preachedOn: new Date(`${kampalaDay(entry.publishedAt)}T00:00:00.000Z`),
            youtubeUrl: entry.url,
            youtubeVideoId: entry.videoId,
            thumbnailUrl: hqThumbnail(entry.videoId),
            isPublished: false,
            status: 'DRAFT',
            isPlaceholder: false,
          },
        });
        created += 1;
      } catch (error) {
        if (!isUniqueConflict(error)) throw error;
      }
    }
  }
  return { created };
}

export async function importYoutubeForOrganization(organizationId: string) {
  const prisma = requirePrisma();
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { youtubeChannelId: true },
  });
  if (!organization?.youtubeChannelId) {
    throw new SanctumError('VALIDATION_ERROR', 'Save a YouTube channel before checking for new messages.', 400);
  }
  return importYoutubeChannels(organizationId);
}
