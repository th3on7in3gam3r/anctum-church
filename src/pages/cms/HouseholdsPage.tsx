import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsHousehold } from '../../services/api/cmsApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

export const HouseholdsPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsHousehold[]>([]);
  const [editing, setEditing] = useState<Partial<CmsHousehold> | null>(null);
  const [error, setError] = useState('');

  const load = () => {
    cmsApi.listHouseholds(organization.id).then((result) => setRows(result.households)).catch((err: Error) => setError(err.message));
  };
  useEffect(load, [organization.id]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Households" description="Families and homes linked to church members." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing({})}>Add household</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <CmsListRow key={row.id} onClick={() => setEditing(row)}>
            <p className="text-sm font-bold text-ink">{row.name}</p>
            <p className="mt-1 text-xs text-muted">{row.phone || 'No phone'} · {row._count?.members || 0} members</p>
          </CmsListRow>
        ))}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit household' : 'Add household'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const body = Object.fromEntries(new FormData(event.currentTarget).entries());
            await cmsApi.saveHousehold(organization.id, editing.id || null, body);
            setEditing(null);
            load();
          }}>
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" name="name" className={fieldClass} defaultValue={editing.name || ''} required />
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className={fieldClass} defaultValue={editing.phone || ''} />
            <label className={labelClass} htmlFor="address">Address</label>
            <textarea id="address" name="address" className={fieldClass} defaultValue={editing.address || ''} rows={3} />
            <button className={primaryButtonClass} type="submit">Save household</button>
          </form>
        )}
      </CmsDrawer>
    </div>
  );
};
