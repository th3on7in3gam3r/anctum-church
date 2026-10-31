import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlbumView } from '@/components/gallery/AlbumView';
import { VideoTile } from '@/components/gallery/VideoTile';
import { getPublicAlbum } from '@/lib/api';
import { siteEnv } from '@/lib/env';

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const album = await getPublicAlbum(slug);
  if (!album) return { title: 'Gallery' };
  return {
    title: album.title,
    description: album.description || album.title,
    openGraph: album.cover ? { images: [{ url: album.cover.url }] } : undefined,
  };
}

export default async function AlbumPage({ params }: Params) {
  const { slug } = await params;
  const album = await getPublicAlbum(slug);
  if (!album) notFound();
  const when = new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Africa/Kampala' }).format(new Date(album.date));
  const shareUrl = `${siteEnv().siteUrl}/gallery/${slug}`;

  return (
    <article className="bg-cream text-ink">
      <header className="bg-forest-900 px-4 py-16 text-on-dark sm:px-6">
        <p className="text-xs uppercase tracking-wide text-gold-light">{when}</p>
        <h1 className="mt-2 max-w-4xl font-display text-[clamp(40px,6vw,84px)] leading-none">{album.title}</h1>
        <p className="mt-4 flex flex-wrap gap-3 text-sand">
          {album.event ? <Link href={`/events/${album.event.id}`}>{album.event.title}</Link> : null}
          {album.sermon ? <Link href={`/sermons/${album.sermon.id}`}>{album.sermon.title}</Link> : null}
        </p>
      </header>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <AlbumView photos={album.photos} shareUrl={shareUrl} />
        {album.videos.length ? (
          <div className="mt-8 flex gap-3 overflow-x-auto">
            {album.videos.map((video) => <div key={video.id} className="w-44 shrink-0"><VideoTile video={video} /></div>)}
          </div>
        ) : null}
      </div>
    </article>
  );
}
