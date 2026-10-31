import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsVisitor } from '../../services/api/cmsApi';
import { CmsPageHeader, fieldClass } from './CmsDrawer';

const STATUSES: CmsVisitor['status'][] = ['NEW', 'CONTACTED', 'DONE'];

export const VisitorsPage: React.FC = () => {
  const { organization } = useAuth();
  const [rows, setRows] = useState<CmsVisitor[]>([]);
  const [error, setError] = useState('');

  const load = () => {
    cmsApi.listVisitors(organization.id).then((result) => setRows(result.visitors)).catch((err: Error) => setError(err.message));
  };
  useEffect(load, [organization.id]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Visitors" description="Cards from plan-a-visit, contact, and prayer. Move each one from new to contacted to done." />
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {rows.map((row) => (
          <article key={row.id} className="ui-card space-y-2 p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-ink">{row.phone}</p>
                <p className="text-xs text-muted">{row.name} · {row.source.replaceAll('_', ' ')}{row.service ? ` · ${row.service}` : ''}</p>
              </div>
              <select
                className={fieldClass}
                value={row.status}
                aria-label={`Status for ${row.name}`}
                onChange={async (event) => {
                  const status = event.target.value as CmsVisitor['status'];
                  await cmsApi.updateVisitor(organization.id, row.id, status);
                  load();
                }}
              >
                {STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
              </select>
            </div>
            {row.message && <p className="text-xs text-ink">{row.message}</p>}
          </article>
        ))}
        {rows.length === 0 && <p className="text-sm text-muted">No visitor cards yet.</p>}
      </div>
    </div>
  );
};
