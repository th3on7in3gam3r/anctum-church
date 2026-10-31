import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageHero } from '@/components/page/PageHero';
import { PhotoTile } from '@/components/page/PhotoTile';
import { YoutubeFacade } from '@/components/YoutubeFacade';
import { JsonLd } from '@/components/JsonLd';
import Link from 'next/link';
import { getSermon, listPublicAlbums } from '@/lib/api';
import { siteEnv } from '@/lib/env';
import { formatDay } from '@/lib/format';
import { sermonJsonLd } from '@/lib/jsonld';

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const sermon = await getSermon(id);
  if (!sermon) return { title: 'Sermon' };
  return {
    title: sermon.title,
    description: sermon.notes?.slice(0, 160) || `${sermon.title} by ${sermon.speaker}.`,
  };
}

export default async function SermonDetailPage({ params }: Params) {
  const { id } = await params;
  const sermon = await getSermon(id);
  if (!sermon) notFound();
  const albums = await listPublicAlbums(`?sermonId=${sermon.id}`);
  const video = sermonJsonLd(sermon, `${siteEnv().siteUrl}/sermons/${sermon.id}`);

  return (
    <div className="bg-forest-950 text-on-dark">
      {video ? <JsonLd data={video} /> : null}
      <PageHero
        fitTitle
        variant="split"
        eyebrow="Message"
        title={sermon.title}
        lede={`${formatDay(sermon.preachedOn)}${sermon.scripture ? ` · ${sermon.scripture}` : ''}`}
        aside={sermon.youtubeUrl ? <YoutubeFacade url={sermon.youtubeUrl} title={sermon.title} /> : <PhotoTile src={null} sizes="(min-width: 900px) 40vw, 100vw" className="aspect-video rounded-2xl" />}
      >
        <p className="mt-4 text-sand">{sermon.speaker}{sermon.seriesName ? ` · ${sermon.seriesName}` : ''}</p>
      </PageHero>
      {sermon.notes ? <div className="mx-auto max-w-3xl whitespace-pre-wrap px-4 py-16 text-lg leading-relaxed sm:px-6">{sermon.notes}</div> : null}
      {albums.albums.length ? (
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <h2 className="font-display text-3xl text-on-dark">Photos from this service</h2>
          <div className="mt-3 flex flex-wrap gap-3">
            {albums.albums.map((album) => <Link key={album.id} href={`/gallery/${album.slug}`} className="text-gold-light underline">{album.title}</Link>)}
          </div>
        </div>
      ) : null}
      {sermon.audioUrl ? (
        <div className="mx-auto max-w-3xl px-4 pb-16 sm:px-6">
          <a href={sermon.audioUrl} className="site-button border border-sand text-on-dark">Listen (audio only)</a>
        </div>
      ) : null}
    </div>
  );
}
