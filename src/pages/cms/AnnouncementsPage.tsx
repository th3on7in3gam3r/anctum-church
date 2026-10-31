import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsAnnouncement } from '../../services/api/cmsApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, SampleBadge, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

function localInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const AnnouncementsPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsAnnouncement[]>([]);
  const [editing, setEditing] = useState<Partial<CmsAnnouncement> | null>(null);
  const [error, setError] = useState('');
  const load = () => cmsApi.listAnnouncements(organization.id).then((result) => setRows(result.announcements)).catch((err: Error) => setError(err.message));
  useEffect(load, [organization.id]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Announcements" description="Notices that show while they are in their start and end window." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing({ isPinned: false })}>Add announcement</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <CmsListRow key={row.id} onClick={() => setEditing(row)}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">{row.isPinned ? 'Pinned · ' : ''}{row.title}{row.isPlaceholder ? <SampleBadge /> : null}</p>
            <p className="mt-1 line-clamp-2 text-xs text-muted">{row.body}</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit announcement' : 'Add announcement'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            const ends = String(form.get('endsAt') || '');
            await cmsApi.saveAnnouncement(organization.id, editing.id || null, {
              title: form.get('title'),
              body: form.get('body'),
              startsAt: new Date(String(form.get('startsAt'))).toISOString(),
              endsAt: ends ? new Date(ends).toISOString() : null,
              isPinned: form.get('isPinned') === 'on',
            });
            setEditing(null);
            load();
          }}>
            {editing.isPlaceholder ? <SampleBadge /> : null}
            <label className={labelClass} htmlFor="title">Title</label>
            <input id="title" name="title" className={fieldClass} defaultValue={editing.title || ''} required />
            <label className={labelClass} htmlFor="body">Body</label>
            <textarea id="body" name="body" className={fieldClass} defaultValue={editing.body || ''} rows={4} required />
            <label className={labelClass} htmlFor="startsAt">Starts</label>
            <input id="startsAt" name="startsAt" type="datetime-local" className={fieldClass} defaultValue={localInput(editing.startsAt)} required />
            <label className={labelClass} htmlFor="endsAt">Ends</label>
            <input id="endsAt" name="endsAt" type="datetime-local" className={fieldClass} defaultValue={localInput(editing.endsAt)} />
            <label className="flex items-center gap-2 text-xs font-semibold" htmlFor="isPinned">
              <input id="isPinned" name="isPinned" type="checkbox" defaultChecked={Boolean(editing.isPinned)} />
              Pin to the top
            </label>
            <button className={primaryButtonClass} type="submit">Save announcement</button>
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
