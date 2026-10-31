import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsSermon } from '../../services/api/cmsApi';
import { ApiClientError } from '../../services/api/sanctumApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, SampleBadge, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

function isYoutubeDraft(row: CmsSermon) {
  return Boolean(row.youtubeVideoId) && row.status !== 'PUBLISHED' && !row.isPublished;
}

const YoutubeReviewCard: React.FC<{
  row: CmsSermon;
  onSave: (fields: { title: string; speaker: string; scripture: string; seriesName: string }) => Promise<void>;
  onPublish: (fields: { title: string; speaker: string; scripture: string; seriesName: string }) => Promise<void>;
  onIgnore: () => Promise<void>;
  onSend: () => Promise<void>;
}> = ({
  row,
  onSave,
  onPublish,
  onIgnore,
  onSend,
}) => {
  const [title, setTitle] = useState(row.title);
  const [speaker, setSpeaker] = useState(row.speaker);
  const [scripture, setScripture] = useState(row.scripture || '');
  const [seriesName, setSeriesName] = useState(row.seriesName || '');
  function readFields(form: HTMLFormElement) {
    const data = new FormData(form);
    return {
      title: String(data.get('title') || ''),
      speaker: String(data.get('speaker') || ''),
      scripture: String(data.get('scripture') || ''),
      seriesName: String(data.get('seriesName') || ''),
    };
  }
  return (
    <form className="grid gap-3 rounded-2xl border border-[#E5E6E1] px-3 py-3 dark:border-[#26362F] md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]" onSubmit={(event) => event.preventDefault()}>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wide text-muted">Original title</p>
        <p className="mt-1 text-sm text-ink">{row.sourceTitle || row.title}</p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className={labelClass}>Title</span>
          <input name="title" className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} onBlur={(event) => void onSave(readFields(event.currentTarget.form!))} />
        </label>
        <label className="block">
          <span className={labelClass}>Speaker</span>
          <input name="speaker" className={fieldClass} value={speaker} onChange={(event) => setSpeaker(event.target.value)} onBlur={(event) => void onSave(readFields(event.currentTarget.form!))} />
        </label>
        <label className="block">
          <span className={labelClass}>Scripture</span>
          <input name="scripture" className={fieldClass} value={scripture} onChange={(event) => setScripture(event.target.value)} onBlur={(event) => void onSave(readFields(event.currentTarget.form!))} />
        </label>
        <label className="block sm:col-span-2">
          <span className={labelClass}>Series</span>
          <input name="seriesName" className={fieldClass} value={seriesName} onChange={(event) => setSeriesName(event.target.value)} onBlur={(event) => void onSave(readFields(event.currentTarget.form!))} />
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <button type="button" className={primaryButtonClass} onClick={(event) => void onPublish(readFields(event.currentTarget.form!))}>Publish</button>
          <button type="button" className="rounded-full border border-[#E5E6E1] px-4 py-2 text-xs font-bold dark:border-[#26362F]" onClick={() => void onSend()}>Send to Gallery</button>
          <button type="button" className="rounded-full border border-[#E5E6E1] px-4 py-2 text-xs font-bold dark:border-[#26362F]" onClick={() => void onIgnore()}>Ignore</button>
        </div>
      </div>
    </form>
  );
};

export const SermonsPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsSermon[]>([]);
  const [editing, setEditing] = useState<Partial<CmsSermon> | null>(null);
  const [title, setTitle] = useState('');
  const [speaker, setSpeaker] = useState('');
  const [scripture, setScripture] = useState('');
  const [seriesName, setSeriesName] = useState('');
  const [sourceTitle, setSourceTitle] = useState('');
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');

  const load = () => cmsApi.listSermons(organization.id).then((result) => setRows(result.sermons)).catch((err: Error) => setError(err.message));
  useEffect(load, [organization.id]);

  function openEditor(row: Partial<CmsSermon>) {
    setEditing(row);
    setTitle(row.title || '');
    setSpeaker(row.speaker || organization.defaultSermonSpeaker || '');
    setScripture(row.scripture || '');
    setSeriesName(row.seriesName || '');
    setSourceTitle(row.sourceTitle || '');
    setPreview(row.thumbnailUrl || '');
    setError('');
  }

  async function onYoutubeBlur(url: string) {
    const trimmed = url.trim();
    if (!trimmed) {
      setPreview('');
      return;
    }
    try {
      const result = await cmsApi.lookupYoutube(organization.id, trimmed);
      setPreview(result.thumbnailUrl);
      setSourceTitle(result.sourceTitle);
      setTitle((current) => current.trim() ? current : result.title);
      setScripture((current) => current.trim() ? current : result.scripture || '');
      setSeriesName((current) => current.trim() ? current : result.seriesName || '');
      setSpeaker((current) => {
        const fallback = organization.defaultSermonSpeaker || '';
        if (!current.trim() || current.trim() === fallback) return result.speaker || current;
        return current;
      });
      setError('');
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : 'That YouTube link could not be read.');
    }
  }

  const drafts = rows.filter(isYoutubeDraft);
  const listed = rows.filter((row) => !isYoutubeDraft(row));

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Sermons" description={`Messages preached at ${organization.name || 'your church'}.`} action={<button type="button" className={primaryButtonClass} onClick={() => openEditor({ isPublished: false, status: 'DRAFT' })}>Add sermon</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      {drafts.length ? (
        <section className="space-y-2 rounded-3xl border border-[#E5E6E1] bg-white p-4 dark:border-[#26362F] dark:bg-[#17221D]">
          <h2 className="text-sm font-extrabold text-ink">From YouTube — needs review</h2>
          <p className="text-xs text-muted">Confirm speaker, series, and scripture, then publish. Ignore a video that is not a sermon.</p>
          {drafts.map((row) => (
            <YoutubeReviewCard
              key={row.id}
              row={row}
              onSave={async (fields) => {
                await cmsApi.saveSermon(organization.id, row.id, {
                  ...fields,
                  preachedOn: String(row.preachedOn).slice(0, 10),
                  youtubeUrl: row.youtubeUrl,
                  isPublished: false,
                });
                load();
              }}
              onPublish={async (fields) => {
                try {
                  await cmsApi.saveSermon(organization.id, row.id, {
                    ...fields,
                    preachedOn: String(row.preachedOn).slice(0, 10),
                    youtubeUrl: row.youtubeUrl,
                    isPublished: false,
                  });
                  await cmsApi.publishSermon(organization.id, row.id);
                  load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not publish this message.');
                }
              }}
              onIgnore={async () => {
                try {
                  await cmsApi.ignoreSermon(organization.id, row.id);
                  load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not ignore this video.');
                }
              }}
              onSend={async () => {
                try {
                  await cmsApi.sendSermonToGallery(organization.id, row.id);
                  load();
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Could not send this video to the gallery.');
                }
              }}
            />
          ))}
        </section>
      ) : null}
      <div className="space-y-2">
        {listed.map((row) => (
          <CmsListRow key={row.id} onClick={() => openEditor(row)}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">{row.title}{row.isPlaceholder ? <SampleBadge /> : null}</p>
            <p className="mt-1 text-xs text-muted">{row.speaker} · {String(row.preachedOn).slice(0, 10)} · {row.status === 'PUBLISHED' || row.isPublished ? 'Published' : 'Draft'}</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit sermon' : 'Add sermon'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await cmsApi.saveSermon(organization.id, editing.id || null, {
              title,
              ...(sourceTitle ? { sourceTitle } : {}),
              speaker,
              seriesName,
              scripture,
              preachedOn: form.get('preachedOn'),
              youtubeUrl: form.get('youtubeUrl'),
              audioUrl: form.get('audioUrl'),
              notes: form.get('notes'),
              isPublished: form.get('isPublished') === 'on',
            });
            setEditing(null);
            load();
          }}>
            {editing.isPlaceholder ? <SampleBadge /> : null}
            {sourceTitle ? <p className="text-xs text-muted">Original title: {sourceTitle}</p> : null}
            <label className={labelClass} htmlFor="title">Title</label>
            <input id="title" name="title" className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
            <label className={labelClass} htmlFor="speaker">Speaker</label>
            <input id="speaker" name="speaker" className={fieldClass} value={speaker} onChange={(event) => setSpeaker(event.target.value)} required />
            <label className={labelClass} htmlFor="preachedOn">Preached on</label>
            <input id="preachedOn" name="preachedOn" type="date" className={fieldClass} defaultValue={String(editing.preachedOn || '').slice(0, 10)} required />
            <label className={labelClass} htmlFor="scripture">Scripture</label>
            <input id="scripture" name="scripture" className={fieldClass} value={scripture} onChange={(event) => setScripture(event.target.value)} />
            <label className={labelClass} htmlFor="seriesName">Series</label>
            <input id="seriesName" name="seriesName" className={fieldClass} value={seriesName} onChange={(event) => setSeriesName(event.target.value)} />
            <label className={labelClass} htmlFor="youtubeUrl">YouTube URL</label>
            <input id="youtubeUrl" name="youtubeUrl" className={fieldClass} defaultValue={editing.youtubeUrl || ''} onBlur={(event) => void onYoutubeBlur(event.target.value)} />
            {preview ? <img src={preview} alt="" className="aspect-video w-full rounded-2xl object-cover" /> : null}
            <label className={labelClass} htmlFor="audioUrl">Audio URL</label>
            <input id="audioUrl" name="audioUrl" className={fieldClass} defaultValue={editing.audioUrl || ''} />
            <label className={labelClass} htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" className={fieldClass} defaultValue={editing.notes || ''} rows={4} />
            <label className="flex items-center gap-2 text-xs font-semibold" htmlFor="isPublished">
              <input id="isPublished" name="isPublished" type="checkbox" defaultChecked={Boolean(editing.isPublished || editing.status === 'PUBLISHED')} />
              Published
            </label>
            <button className={primaryButtonClass} type="submit">Save sermon</button>
            {editing.id && (editing.status === 'PUBLISHED' || editing.isPublished) && editing.youtubeUrl ? (
              <button
                className="rounded-full border border-[#E5E6E1] px-4 py-2 text-xs font-bold dark:border-[#26362F]"
                type="button"
                onClick={async () => {
                  await cmsApi.moveSermonToGallery(organization.id, editing.id);
                  setEditing(null);
                  load();
                }}
              >
                Move to Gallery
              </button>
            ) : null}
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
