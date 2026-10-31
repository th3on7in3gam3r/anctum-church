'use client';

import Image from 'next/image';
import { useState } from 'react';
import { youtubeId } from '@/lib/youtube';

export function YoutubeFacade({ url, title }: { url: string; title: string }) {
  const id = youtubeId(url);
  const [playing, setPlaying] = useState(false);

  if (!id) {
    return (
      <a href={url} className="font-semibold text-ink underline">
        Watch on YouTube
      </a>
    );
  }

  if (playing) {
    return (
      <div className="aspect-video overflow-hidden rounded-2xl bg-ink">
        <iframe
          className="h-full w-full"
          src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-forest-950 text-left"
      aria-label={`Play ${title}`}
    >
      <Image
        src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
        alt=""
        fill
        sizes="(min-width: 900px) 40vw, 100vw"
        className="object-cover opacity-90"
      />
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold text-ink" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="ml-1 h-7 w-7 fill-current"><path d="M8 5v14l11-7z" /></svg>
        </span>
      </span>
    </button>
  );
}
