import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi } from '../../services/api/cmsApi';
import { primaryButtonClass } from './CmsDrawer';
import { browserUploadQueue, resizeForUpload } from './gallery/uploadQueue';

type Photo = {
  id: string;
  url: string;
  alt: string;
  caption: string | null;
  hasMinors: boolean;
  consentConfirmed: boolean;
  isHidden: boolean;
  sortOrder: number;
};
type Album = {
  id: string;
  title: string;
  category: string;
  date: string;
  status: string;
  photoCount?: number;
  blockedMinors?: number;
  coverPhoto?: { url: string } | null;
  photos?: Photo[];
  eventId?: string | null;
  sermonId?: string | null;
  groupId?: string | null;
};

export function GalleryPage({ review = false }: { review?: boolean }) {
  const { organization, user } = useAuth();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [events, setEvents] = useState<Array<{ id: string; title: string }>>([]);
  const [selected, setSelected] = useState<Album | null>(null);
  const [progress, setProgress] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const publisher = user?.role === 'OWNER' || user?.role === 'ADMIN';
  const canLink = publisher;

  async function load() {
    const result = await cmsApi.listGalleryAlbums(organization.id);
    setAlbums(result.albums as Album[]);
  }

  useEffect(() => {
    void load();
    if (canLink) {
      cmsApi.listEvents(organization.id).then((result) => setEvents(result.events.map((event) => ({ id: event.id, title: event.title })))).catch(() => undefined);
    }
  }, [organization.id, canLink]);

  async function openAlbum(id: string) {
    const result = await cmsApi.galleryAlbum(organization.id, id);
    setSelected(result.album as Album);
  }

  async function create(body: Record<string, unknown>) {
    const result = await cmsApi.createGalleryAlbum(organization.id, body);
    await openAlbum(result.album.id);
    await load();
  }

  async function uploadFiles(files: FileList | File[]) {
    if (!selected) return;
    const list = [...files];
    let done = 0;
    const queue = browserUploadQueue(async (job) => {
      const file = list.find((item) => item.name === job.name);
      if (!file) return;
      const prepared = await resizeForUpload(file);
      const signature = await cmsApi.galleryUploadSignature(organization.id, selected.id);
      const body = new FormData();
      body.set('file', prepared.blob, file.name.replace(/\.\w+$/, '.webp'));
      body.set('api_key', String(signature.apiKey));
      body.set('timestamp', String(signature.timestamp));
      body.set('signature', String(signature.signature));
      body.set('folder', String(signature.folder));
      body.set('allowed_formats', String(signature.allowedFormats));
      body.set('max_file_size', String(signature.maxFileSize));
      const uploaded = await new Promise<{ public_id: string; secure_url: string; bytes: number; format: string }>((resolve, reject) => {
        const request = new XMLHttpRequest();
        request.open('POST', String(signature.uploadUrl));
        request.onload = () => {
          if (request.status >= 200 && request.status < 300) resolve(JSON.parse(request.responseText));
          else reject(new Error('Upload failed'));
        };
        request.onerror = () => reject(new Error('Upload failed'));
        request.send(body);
      });
      await cmsApi.saveGalleryPhoto(organization.id, selected.id, {
        storageKey: uploaded.public_id,
        url: uploaded.secure_url,
        width: prepared.width,
        height: prepared.height,
        blurDataUrl: prepared.blurDataUrl,
        folder: signature.folder,
        format: 'webp',
        bytes: uploaded.bytes,
        alt: `Photo from ${selected.title}`,
      });
      done += 1;
      setProgress(`${done} of ${list.length} uploaded — keep this page open or come back later.`);
    });
    await queue.resume();
    for (const file of list) {
      await queue.enqueue({ id: `${selected.id}:${file.name}:${file.size}`, albumId: selected.id, name: file.name });
    }
    for (let index = 0; index < list.length; index += 1) await queue.tick();
    await openAlbum(selected.id);
  }

  const shown = review ? albums.filter((album) => album.status === 'SUBMITTED' || album.status === 'DRAFT') : albums;

  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink">{review ? 'Review gallery' : 'Gallery'}</h1>
          <p className="text-sm text-muted">Photos and video embeds from the life of the church.</p>
        </div>
        {review ? null : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button className={primaryButtonClass} type="button" onClick={() => void create({ preset: 'service' })}>New album from today&apos;s service</button>
            {canLink && events[0] ? (
              <button className="rounded-full border border-[#E5E6E1] px-4 py-2 text-xs font-bold dark:border-[#26362F]" type="button" onClick={() => void create({ title: events[0].title, date: new Date().toISOString(), category: 'EVENT', eventId: events[0].id })}>New event album</button>
            ) : null}
          </div>
        )}
      </div>
      {progress ? <p className="rounded-2xl bg-[#F5F1E8] px-4 py-3 text-sm text-ink dark:bg-[#17221D]">{progress}</p> : null}
      {selected ? (
        <section className="space-y-4 rounded-3xl border border-[#E5E6E1] p-4 dark:border-[#26362F]">
          <button type="button" className="text-xs font-bold uppercase text-muted" onClick={() => setSelected(null)}>All albums</button>
          <h2 className="font-serif text-2xl">{selected.title}</h2>
          <p className="text-xs uppercase tracking-wide text-muted">{selected.category} · {String(selected.date).slice(0, 10)} · {selected.status}</p>
          <label className="block rounded-2xl border border-dashed border-[#C9A35A] p-6 text-center text-sm">
            Add photos from your camera roll
            <input className="sr-only" type="file" accept="image/*" multiple onChange={(event) => event.target.files && void uploadFiles(event.target.files)} />
          </label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[...(selected.photos || [])].sort((left, right) => Number(right.hasMinors && !right.consentConfirmed) - Number(left.hasMinors && !left.consentConfirmed)).map((photo) => (
              <figure key={photo.id} className="space-y-2">
                <img src={photo.url} alt={photo.alt} className="aspect-square w-full rounded-2xl object-cover" />
                <input className="w-full rounded-xl border px-2 py-1 text-xs" value={photo.alt} onChange={(event) => {
                  const alt = event.target.value;
                  setSelected({ ...selected, photos: selected.photos?.map((item) => item.id === photo.id ? { ...item, alt } : item) });
                }} onBlur={() => void cmsApi.updateGalleryPhoto(organization.id, selected.id, photo.id, { alt: photo.alt })} />
                <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={photo.hasMinors} onChange={(event) => void cmsApi.updateGalleryPhoto(organization.id, selected.id, photo.id, { hasMinors: event.target.checked }).then(() => openAlbum(selected.id))} /> contains minors</label>
                <div className="flex gap-2 text-xs">
                  <button type="button" onClick={() => void cmsApi.saveGalleryAlbum(organization.id, selected.id, { coverPhotoId: photo.id })}>Cover</button>
                  <button type="button" onClick={() => void cmsApi.updateGalleryPhoto(organization.id, selected.id, photo.id, { isHidden: !photo.isHidden }).then(() => openAlbum(selected.id))}>{photo.isHidden ? 'Show' : 'Hide'}</button>
                  {publisher ? <button type="button" onClick={() => void cmsApi.confirmGalleryConsent(organization.id, selected.id, photo.id).then(() => openAlbum(selected.id))}>Confirm consent</button> : null}
                </div>
              </figure>
            ))}
          </div>
          <form className="flex flex-col gap-2 sm:flex-row" onSubmit={async (event) => {
            event.preventDefault();
            const looked = await cmsApi.lookupGalleryVideo(organization.id, videoUrl);
            await cmsApi.addGalleryVideo(organization.id, { ...looked, albumId: selected.id, orientation: looked.provider === 'TIKTOK' ? 'VERTICAL' : 'LANDSCAPE' });
            setVideoUrl('');
            await openAlbum(selected.id);
          }}>
            <input className="flex-1 rounded-xl border px-3 py-2 text-sm" value={videoUrl} onChange={(event) => setVideoUrl(event.target.value)} placeholder="Paste a YouTube or TikTok link" />
            <button className={primaryButtonClass} type="submit">Add video</button>
          </form>
          {selected.status === 'DRAFT' ? <button className={primaryButtonClass} type="button" onClick={() => void cmsApi.submitGalleryAlbum(organization.id, selected.id).then(() => openAlbum(selected.id))}>Submit for review</button> : null}
          {publisher && (selected.status === 'DRAFT' || selected.status === 'SUBMITTED') ? <button className={primaryButtonClass} type="button" onClick={() => void cmsApi.publishGalleryAlbum(organization.id, selected.id).then(() => openAlbum(selected.id))}>Publish album</button> : null}
          {publisher && selected.status === 'PUBLISHED' ? <button type="button" className="text-xs font-bold" onClick={() => void cmsApi.archiveGalleryAlbum(organization.id, selected.id).then(() => openAlbum(selected.id))}>Archive</button> : null}
        </section>
      ) : (
        <div className="grid gap-3">
          {shown.map((album) => (
            <button key={album.id} type="button" className="flex items-center gap-3 rounded-2xl border border-[#E5E6E1] p-3 text-left dark:border-[#26362F]" onClick={() => void openAlbum(album.id)}>
              {album.coverPhoto?.url ? <img src={album.coverPhoto.url} alt="" className="h-16 w-16 rounded-xl object-cover" /> : <span className="h-16 w-16 rounded-xl bg-[#EDE6D6]" />}
              <span>
                <span className="block font-semibold">{album.title}</span>
                <span className="text-xs text-muted">{album.category} · {String(album.date).slice(0, 10)} · {album.photoCount || 0} photos · {album.status}{album.blockedMinors ? ` · ${album.blockedMinors} need consent` : ''}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
