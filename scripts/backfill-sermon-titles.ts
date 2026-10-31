import 'dotenv/config';
import { parseSermonTitle, tidyTitle } from '../shared/youtube.ts';
import { getPrisma } from '../server/prisma.ts';

const prisma = getPrisma();
if (!prisma) throw new Error('DATABASE_URL is not configured');
const FALLBACK_SPEAKER = 'Pastor GraceLove Hiire';

async function main() {
  const organizations = await prisma.organization.findMany({
    select: { id: true, defaultSermonSpeaker: true, speakerAliases: true },
  });
  const sermons = await prisma.sermon.findMany({
    select: {
      id: true,
      organizationId: true,
      title: true,
      sourceTitle: true,
      scripture: true,
      speaker: true,
      seriesName: true,
      notes: true,
      isPlaceholder: true,
      youtubeVideoId: true,
    },
  });
  const orgs = new Map(organizations.map((organization) => [organization.id, organization]));
  const seriesByOrg = new Map<string, string[]>();
  for (const sermon of sermons) {
    if (!sermon.seriesName) continue;
    const names = seriesByOrg.get(sermon.organizationId) ?? [];
    if (!names.includes(sermon.seriesName)) names.push(sermon.seriesName);
    seriesByOrg.set(sermon.organizationId, names);
  }

  let changed = 0;
  for (const sermon of sermons) {
    if (!sermon.sourceTitle) continue;
    const organization = orgs.get(sermon.organizationId);
    const parsed = parseSermonTitle(
      sermon.sourceTitle,
      {
        defaultSpeaker: organization?.defaultSermonSpeaker || FALLBACK_SPEAKER,
        aliases: organization?.speakerAliases ?? [],
      },
      seriesByOrg.get(sermon.organizationId) ?? [],
    );
    const automatic = sermon.title === sermon.sourceTitle
      || sermon.title === parsed.title
      || tidyTitle(sermon.title) === parsed.title
      || sermon.title === tidyTitle(sermon.sourceTitle);
    if (!automatic) continue;

    const clearSample = sermon.isPlaceholder && Boolean(sermon.youtubeVideoId);
    const scripture = parsed.scripture || sermon.scripture || '';
    const speaker = parsed.speaker || sermon.speaker;
    const series = parsed.seriesName || '';
    const notes = clearSample ? null : sermon.notes;
    const same = sermon.title === parsed.title
      && (sermon.scripture || '') === scripture
      && sermon.speaker === speaker
      && (sermon.seriesName || '') === series
      && sermon.notes === notes;
    if (same) continue;

    await prisma.sermon.update({
      where: { id: sermon.id },
      data: {
        title: parsed.title,
        ...(parsed.scripture ? { scripture: parsed.scripture } : {}),
        ...(parsed.speaker ? { speaker: parsed.speaker } : {}),
        seriesName: parsed.seriesName,
        ...(clearSample ? { notes: null } : {}),
      },
    });
    changed += 1;
    console.log(`${sermon.title} → ${parsed.title} | ${scripture} | ${speaker} | ${series}${clearSample && sermon.notes ? ' | description cleared' : ''}`);
  }
  if (changed === 0) console.log('No sermon titles needed parsing.');
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
