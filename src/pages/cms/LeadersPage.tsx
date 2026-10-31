import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsLeader } from '../../services/api/cmsApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, SampleBadge, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

export const LeadersPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsLeader[]>([]);
  const [editing, setEditing] = useState<Partial<CmsLeader> | null>(null);
  const [error, setError] = useState('');
  const load = () => cmsApi.listLeaders(organization.id).then((result) => setRows(result.leaders)).catch((err: Error) => setError(err.message));
  useEffect(load, [organization.id]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Leaders" description="People shown on the public leadership section. The first by order is featured." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing({ sortOrder: rows.length })}>Add leader</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <CmsListRow key={row.id} onClick={() => setEditing(row)}>
            <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-ink">{row.name}{row.isPlaceholder ? <SampleBadge /> : null}</p>
            <p className="mt-1 text-xs text-muted">{row.role}</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit leader' : 'Add leader'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            await cmsApi.saveLeader(organization.id, editing.id || null, {
              name: form.get('name'),
              role: form.get('role'),
              photoUrl: form.get('photoUrl'),
              bio: form.get('bio'),
              sortOrder: Number(form.get('sortOrder') || 0),
            });
            setEditing(null);
            load();
          }}>
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" name="name" className={fieldClass} defaultValue={editing.name || ''} required />
            <label className={labelClass} htmlFor="role">Role</label>
            <input id="role" name="role" className={fieldClass} defaultValue={editing.role || ''} required />
            <label className={labelClass} htmlFor="photoUrl">Photo address</label>
            <input id="photoUrl" name="photoUrl" className={fieldClass} defaultValue={editing.photoUrl || ''} />
            <label className={labelClass} htmlFor="bio">Bio</label>
            <textarea id="bio" name="bio" className={fieldClass} defaultValue={editing.bio || ''} rows={4} />
            <label className={labelClass} htmlFor="sortOrder">Order</label>
            <input id="sortOrder" name="sortOrder" type="number" min={0} className={fieldClass} defaultValue={editing.sortOrder ?? 0} />
            <button className={primaryButtonClass} type="submit">Save leader</button>
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
