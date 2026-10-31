import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { LoadMore } from '@/components/page/LoadMore';
import { SpeakerFilter } from '@/components/page/SpeakerFilter';
import { PageHero } from '@/components/page/PageHero';
import { PhotoTile } from '@/components/page/PhotoTile';
import { YoutubeFacade } from '@/components/YoutubeFacade';
import { listSermons, type PublicSermon } from '@/lib/api';
import { church } from '@/lib/church';
import { formatDay } from '@/lib/format';
import { youtubeId } from '@/lib/youtube';

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Sermons from Promised Land Christian Center.',
};

type Search = { searchParams: Promise<{ series?: string; speaker?: string; page?: string }> };

function sermonQuery(series: string, speaker: string, page = 1) {
  const params = new URLSearchParams();
  if (series) params.set('series', series);
  if (speaker) params.set('speaker', speaker);
  if (page > 1) params.set('page', String(page));
  const query = params.toString();
  return query ? `/sermons?${query}` : '/sermons';
}

function SermonThumb({ sermon, sizes }: { sermon: PublicSermon; sizes: string }) {
  const id = youtubeId(sermon.youtubeUrl);
  return (
    <span className="relative block">
      {id ? (
        <span className="relative block aspect-video overflow-hidden rounded-2xl">
          <Image src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" fill sizes={sizes} className="object-cover" />
        </span>
      ) : (
        <PhotoTile src={null} sizes={sizes} className="aspect-video rounded-2xl" />
      )}
      {id ? (
        <span className="absolute bottom-[14px] right-[14px] flex h-10 w-10 items-center justify-center rounded-full bg-gold text-ink" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="ml-0.5 h-4 w-4 fill-current"><path d="M8 5v14l11-7z" /></svg>
        </span>
      ) : sermon.scripture ? (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center px-6 text-center font-display text-2xl text-gold">{sermon.scripture}</span>
      ) : null}
    </span>
  );
}

function SermonCard({ sermon }: { sermon: PublicSermon }) {
  return (
    <Link href={`/sermons/${sermon.id}`} className="block">
      <SermonThumb sermon={sermon} sizes="(min-width: 900px) 30vw, 100vw" />
      <p className="mt-3 text-sm text-gold-light">{formatDay(sermon.preachedOn)}{sermon.scripture ? ` · ${sermon.scripture}` : ''}</p>
      <p className="font-display mt-1 line-clamp-2 text-[28px] leading-tight" title={sermon.title}>{sermon.title}</p>
      <p className="text-sand">{sermon.speaker}{sermon.seriesName ? ` · ${sermon.seriesName}` : ''}</p>
    </Link>
  );
}

export default async function SermonsPage({ searchParams }: Search) {
  const params = await searchParams;
  const sermons = await listSermons();
  const series = params.series?.trim() || '';
  const speaker = params.speaker?.trim() || '';
  const page = Math.max(1, Number(params.page) || 1);
  const latest = sermons[0];
  const seriesNames = [...new Set(sermons.map((item) => item.seriesName).filter((name): name is string => Boolean(name)))];
  const speakers = [...new Set(sermons.map((item) => item.speaker))];
  const filtering = Boolean(series || speaker);
  const pool = filtering ? sermons : sermons.filter((item) => item.id !== latest?.id);
  const visible = pool.filter((item) => {
    if (series && item.seriesName !== series) return false;
    if (speaker && item.speaker !== speaker) return false;
    return true;
  });
  const shown = visible.slice(0, page * 12);

  return (
    <div className="bg-forest-950 text-on-dark">
      {latest ? (
        <PageHero
          fitTitle
          variant="split"
          eyebrow="Messages"
          title={latest.title}
          lede={`${formatDay(latest.preachedOn)}${latest.scripture ? ` · ${latest.scripture}` : ''}`}
          aside={
            <div className="relative">
              <span className="absolute left-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-xs font-semibold text-ink">Latest</span>
              {latest.youtubeUrl ? <YoutubeFacade url={latest.youtubeUrl} title={latest.title} /> : <SermonThumb sermon={latest} sizes="(min-width: 900px) 40vw, 100vw" />}
            </div>
          }
        >
          <p className="mt-4 text-sand">{latest.speaker}{latest.seriesName ? ` · ${latest.seriesName}` : ''}</p>
          {latest.youtubeUrl || latest.audioUrl ? (
            <div className="mt-6 flex flex-wrap gap-3">
              {latest.youtubeUrl ? <Link href={`/sermons/${latest.id}`} className="site-button bg-gold text-ink">Watch</Link> : null}
              {latest.audioUrl ? <a href={latest.audioUrl} className="site-button border border-sand text-on-dark">Listen</a> : null}
            </div>
          ) : null}
        </PageHero>
      ) : (
        <PageHero variant="centered" eyebrow="Messages" title="Messages" lede="Sermons will be published here." />
      )}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col gap-4 border-b border-white/15 pb-6 min-[900px]:flex-row min-[900px]:items-end min-[900px]:justify-between">
          <div className="flex flex-wrap gap-2">
            <Link href={sermonQuery('', speaker)} className={`site-button px-4 text-sm ${series ? 'border border-sand/40' : 'bg-gold text-ink'}`}>All series</Link>
            {seriesNames.map((name) => (
              <Link key={name} href={sermonQuery(name, speaker)} className={`site-button px-4 text-sm ${series === name ? 'bg-gold text-ink' : 'border border-sand/40'}`}>{name}</Link>
            ))}
          </div>
          <SpeakerFilter speakers={speakers} speaker={speaker} series={series} />
          <noscript>
            <form method="get" action="/sermons" className="flex items-end gap-3">
              {series ? <input type="hidden" name="series" value={series} /> : null}
              <label className="text-sm font-semibold text-sand" htmlFor="speaker-fallback">Speaker</label>
              <select id="speaker-fallback" name="speaker" defaultValue={speaker} className="rounded-full border border-sand/40 bg-transparent px-4 py-2 text-on-dark">
                <option value="">All speakers</option>
                {speakers.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <button type="submit" className="site-button border border-sand/40 px-4 text-sm text-on-dark">Apply</button>
            </form>
          </noscript>
        </div>
        {shown.length === 0 ? (
          <div className="mt-12 rounded-[26px] border border-white/10 px-6 py-16 text-center">
            <p className="font-display text-4xl font-light">No messages in this series yet</p>
            <Link href="/sermons" className="site-button mt-6 inline-flex border border-sand text-on-dark">See all messages</Link>
          </div>
        ) : (
          <ul className="mt-8 grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
            {shown.map((sermon) => (
              <li key={sermon.id}><SermonCard sermon={sermon} /></li>
            ))}
          </ul>
        )}
        {shown.length < visible.length ? (
          <div className="mt-10">
            <LoadMore href={sermonQuery(series, speaker, page + 1)} />
          </div>
        ) : null}
        <section className="mt-16 rounded-[26px] border border-white/10 p-8">
          <h2 className="font-display text-4xl font-light">Every message, on YouTube.</h2>
          <p className="mt-3 text-sand">Subscribe to PLCC GRACELOVE so you never miss a Sunday.</p>
          <a href={church.youtube} className="site-button mt-6 bg-gold text-ink">Open the YouTube channel</a>
        </section>
      </div>
    </div>
  );
}
