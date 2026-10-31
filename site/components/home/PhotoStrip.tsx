import Image from 'next/image';
import Link from 'next/link';
import { Reveal } from '@/components/home/Reveal';

export type StripPhoto = { key: string; url: string; alt: string; href: string };

/** Real church photos only: renders nothing until at least three exist. */
export function PhotoStrip({ photos }: { photos: StripPhoto[] }) {
  if (photos.length < 3) return null;
  const [first, ...rest] = photos.slice(0, 3);
  return (
    <section aria-label="Life at Promised Land" className="bg-cream px-4 pt-16 sm:px-6 min-[900px]:pt-20">
      <Reveal className="mx-auto grid max-w-6xl grid-cols-2 gap-3 min-[900px]:grid-cols-[2fr_1fr_1fr] min-[900px]:gap-4">
        {[first, ...rest].map((photo, index) => (
          <Link
            key={photo.key}
            href={photo.href}
            className={`relative overflow-hidden rounded-[22px] ${index === 0 ? 'col-span-2 h-56 min-[900px]:col-span-1 min-[900px]:h-[300px]' : 'h-40 min-[900px]:h-[300px]'}`}
          >
            <Image src={photo.url} alt={photo.alt} fill sizes={index === 0 ? '(min-width: 900px) 50vw, 100vw' : '(min-width: 900px) 25vw, 50vw'} className="object-cover" />
          </Link>
        ))}
      </Reveal>
    </section>
  );
}
