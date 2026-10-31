'use client';

import { useEffect, useRef } from 'react';
import type { GalleryPhoto } from '@/lib/api';

export function Lightbox({
  photos,
  index,
  shareUrl,
  onClose,
  onIndex,
}: {
  photos: GalleryPhoto[];
  index: number;
  shareUrl: string;
  onClose: () => void;
  onIndex: (index: number) => void;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  const photo = photos[index];

  useEffect(() => {
    previous.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowRight') onIndex(Math.min(photos.length - 1, index + 1));
      if (event.key === 'ArrowLeft') onIndex(Math.max(0, index - 1));
      if (event.key === 'Tab' && dialog.current) {
        const items = [...dialog.current.querySelectorAll<HTMLElement>('button, a')];
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }
    let startX = 0;
    function onTouchStart(event: TouchEvent) {
      startX = event.changedTouches[0]?.clientX || 0;
    }
    function onTouchEnd(event: TouchEvent) {
      const delta = (event.changedTouches[0]?.clientX || 0) - startX;
      if (delta > 40) onIndex(Math.max(0, index - 1));
      if (delta < -40) onIndex(Math.min(photos.length - 1, index + 1));
    }
    window.addEventListener('keydown', onKey);
    window.addEventListener('touchstart', onTouchStart);
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
      previous.current?.focus();
    };
  }, [index, onClose, onIndex, photos.length]);

  if (!photo) return null;
  return (
    <div ref={dialog} role="dialog" aria-modal="true" aria-label={photo.alt} tabIndex={-1} className="fixed inset-0 z-50 flex flex-col bg-forest-950/95 text-on-dark">
      <div className="flex items-center justify-between px-4 py-3">
        <button type="button" className="min-h-11 px-3" onClick={onClose}>Close</button>
        <a className="min-h-11 px-3" href={`https://wa.me/?text=${encodeURIComponent(shareUrl)}`}>Share on WhatsApp</a>
      </div>
      <div className="relative flex flex-1 items-center justify-center px-4">
        <button type="button" className="absolute left-2 min-h-11 min-w-11" aria-label="Previous" onClick={() => onIndex(Math.max(0, index - 1))}>←</button>
        {/* Full photo loads only after the lightbox opens. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo.url} alt={photo.alt} className="max-h-[70vh] max-w-full object-contain" />
        <button type="button" className="absolute right-2 min-h-11 min-w-11" aria-label="Next" onClick={() => onIndex(Math.min(photos.length - 1, index + 1))}>→</button>
      </div>
      <div className="flex gap-2 overflow-x-auto px-4 py-3">
        {photos.map((item, itemIndex) => (
          <button key={item.id} type="button" onClick={() => onIndex(itemIndex)} className={itemIndex === index ? 'ring-2 ring-gold' : ''}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={item.url} alt="" className="h-14 w-14 object-cover" />
          </button>
        ))}
      </div>
    </div>
  );
}
