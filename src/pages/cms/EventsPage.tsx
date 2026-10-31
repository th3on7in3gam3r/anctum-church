import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsEvent } from '../../services/api/cmsApi';
import { sanctumApi } from '../../services/api/sanctumApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, SampleBadge, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

function localInput(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const EventsPage: React.FC = () => {
  const { organization, user } = useAuth();
  const [rows, setRows] = useState<CmsEvent[]>([]);
  const [rooms, setRooms] = useState<Array<{ id: string; name: string }>>([]);
  const [editing, setEditing] = useState<Partial<CmsEvent> | null>(null);
  const [error, setError] = useState('');
  const load = () => cmsApi.listEvents(organization.id).then((result) => setRows(result.events)).catch((err: Error) => setError(err.message));
  useEffect(load, [organization.id]);
  useEffect(() => {
    if (!user) return;
    sanctumApi.listPrayerRooms({ userId: user.id, organizationId: organization.id })
      .then((result) => setRooms(result.rooms.map((room) => ({ id: String(room.id), name: String(room.name) }))))
      .catch(() => setRooms([]));
  }, [organization.id, user]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Events" description="Gatherings people can find and, when you allow it, RSVP to." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing({ rsvpEnabled: false })}>Add event</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <CmsListRow key={row.id} onClick={() => setEditing(row)}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">{row.title}{row.isPlaceholder ? <SampleBadge /> : null}</p>
            <p className="mt-1 text-xs text-muted">{row.location} · {new Date(row.startsAt).toLocaleString(undefined, { timeZone: organization.timezone || undefined })} · {row._count?.rsvps || 0} RSVPs</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit event' : 'Add event'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await cmsApi.saveEvent(organization.id, editing.id || null, {
              title: form.get('title'),
              description: form.get('description'),
              location: form.get('location'),
              startsAt: new Date(String(form.get('startsAt'))).toISOString(),
              endsAt: new Date(String(form.get('endsAt'))).toISOString(),
              rsvpEnabled: form.get('rsvpEnabled') === 'on',
              prayerRoomId: form.get('prayerRoomId') || null,
            });
            setEditing(null);
            load();
          }}>
            {editing.isPlaceholder ? <SampleBadge /> : null}
            <label className={labelClass} htmlFor="title">Title</label>
            <input id="title" name="title" className={fieldClass} defaultValue={editing.title || ''} required />
            <label className={labelClass} htmlFor="location">Location</label>
            <input id="location" name="location" className={fieldClass} defaultValue={editing.location || ''} required />
            <label className={labelClass} htmlFor="startsAt">Starts</label>
            <input id="startsAt" name="startsAt" type="datetime-local" className={fieldClass} defaultValue={localInput(editing.startsAt)} required />
            <label className={labelClass} htmlFor="endsAt">Ends</label>
            <input id="endsAt" name="endsAt" type="datetime-local" className={fieldClass} defaultValue={localInput(editing.endsAt)} required />
            <label className={labelClass} htmlFor="description">Description</label>
            <textarea id="description" name="description" className={fieldClass} defaultValue={editing.description || ''} rows={3} />
            <label className="flex items-center gap-2 text-xs font-semibold" htmlFor="rsvpEnabled">
              <input id="rsvpEnabled" name="rsvpEnabled" type="checkbox" defaultChecked={Boolean(editing.rsvpEnabled)} />
              RSVP open
            </label>
            <label className={labelClass} htmlFor="prayerRoomId">Also live on Sanctum</label>
            <select id="prayerRoomId" name="prayerRoomId" className={fieldClass} defaultValue={editing.prayerRoomId || ''}>
              <option value="">Not linked to a room</option>
              {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
            </select>
            <button className={primaryButtonClass} type="submit">Save event</button>
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
