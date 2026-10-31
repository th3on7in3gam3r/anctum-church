'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { GalleryPhoto } from '@/lib/api';
import { Lightbox } from './Lightbox';

export function AlbumView({ photos, shareUrl }: { photos: GalleryPhoto[]; shareUrl: string }) {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
        {photos.map((photo, photoIndex) => (
          <button key={photo.id} type="button" className="relative mb-3 block w-full overflow-hidden rounded-2xl" onClick={() => setIndex(photoIndex)}>
            <Image src={photo.url} alt={photo.alt} width={photo.width} height={photo.height} sizes="(min-width: 1024px) 30vw, 100vw" className="h-auto w-full" placeholder={photo.blurDataUrl ? 'blur' : 'empty'} blurDataURL={photo.blurDataUrl || undefined} />
          </button>
        ))}
      </div>
      {index !== null ? <Lightbox photos={photos} index={index} shareUrl={shareUrl} onClose={() => setIndex(null)} onIndex={setIndex} /> : null}
    </>
  );
}
