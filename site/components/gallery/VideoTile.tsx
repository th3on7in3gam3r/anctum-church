'use client';

import { useState } from 'react';
import type { GalleryVideo } from '@/lib/api';

export function VideoTile({ video }: { video: GalleryVideo }) {
  const [open, setOpen] = useState(false);
  const vertical = video.orientation === 'VERTICAL';
  const src = video.provider === 'YOUTUBE'
    ? `https://www.youtube-nocookie.com/embed/${video.externalId}`
    : `https://www.tiktok.com/embed/v2/${video.externalId}`;
  return (
    <button type="button" className={`relative overflow-hidden rounded-2xl bg-forest-900 text-left ${vertical ? 'aspect-[9/16]' : 'aspect-video'}`} onClick={() => setOpen(true)}>
      {open ? (
        <iframe title={video.title} src={src} className="h-full w-full" allow="autoplay; encrypted-media" allowFullScreen />
      ) : (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-black/50 px-2 py-1 text-[10px] font-bold uppercase text-on-dark">{video.provider === 'YOUTUBE' ? 'YouTube' : 'TikTok'}</span>
          <span className="absolute inset-0 m-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold text-ink" aria-hidden>▶</span>
        </>
      )}
    </button>
  );
}
