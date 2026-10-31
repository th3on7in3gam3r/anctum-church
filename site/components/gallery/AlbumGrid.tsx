import Image from 'next/image';
import Link from 'next/link';
import type { PublicAlbumCard } from '@/lib/api';

function day(value: string) {
  return new Intl.DateTimeFormat('en-UG', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Kampala' }).format(new Date(value));
}

export function AlbumCard({ album }: { album: PublicAlbumCard }) {
  const images = [album.cover, ...album.thumbs].filter(Boolean).slice(0, 3);
  return (
    <Link href={`/gallery/${album.slug}`} className="block overflow-hidden rounded-3xl bg-white text-ink">
      <div className="grid grid-cols-3 gap-1">
        {images.map((photo, index) => photo ? (
          <span key={photo.id} className={`relative block ${index === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-square'}`}>
            <Image src={photo.url} alt={index === 0 ? photo.alt : ''} fill sizes="(min-width: 900px) 20vw, 40vw" className="object-cover" placeholder={photo.blurDataUrl ? 'blur' : 'empty'} blurDataURL={photo.blurDataUrl || undefined} />
          </span>
        ) : null)}
      </div>
      <div className="space-y-1 p-4">
        <p className="text-xs uppercase tracking-wide text-gold-ink">{album.category} · {day(album.date)}</p>
        <h3 className="font-display text-[26px] leading-none">{album.title}</h3>
        <p className="text-sm text-ink/70">{album.photoCount} photos{album.videoCount ? ` · ${album.videoCount} videos` : ''}</p>
      </div>
    </Link>
  );
}

export function FeaturedMosaic({ albums }: { albums: PublicAlbumCard[] }) {
  const [hero, ...rest] = albums;
  if (!hero) return null;
  const extra = Math.max(0, albums.length - 5);
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Link href={`/gallery/${hero.slug}`} className="relative min-h-72 overflow-hidden rounded-3xl md:row-span-2">
        {hero.cover ? <Image src={hero.cover.url} alt={hero.cover.alt} fill sizes="(min-width: 900px) 50vw, 100vw" className="object-cover" priority /> : null}
        <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-forest-950 to-transparent p-5 text-on-dark">
          <span className="text-xs uppercase tracking-wide">{hero.category} · {day(hero.date)}</span>
          <span className="mt-1 block font-display text-4xl">{hero.title}</span>
          <span className="text-sm">{hero.photoCount} photos{hero.videoCount ? ` · ${hero.videoCount} videos` : ''}</span>
        </span>
      </Link>
      <div className="grid grid-cols-2 gap-3">
        {rest.slice(0, 4).map((album, index) => (
          <Link key={album.slug} href={`/gallery/${album.slug}`} className="relative aspect-square overflow-hidden rounded-2xl">
            {album.cover ? <Image src={album.cover.url} alt={album.cover.alt} fill sizes="25vw" className="object-cover" /> : null}
            {index === 3 && extra > 0 ? <span className="absolute inset-0 flex items-center justify-center bg-forest-950/60 font-display text-4xl text-on-dark">+{extra}</span> : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
