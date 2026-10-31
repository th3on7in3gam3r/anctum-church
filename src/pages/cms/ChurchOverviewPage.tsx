import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi } from '../../services/api/cmsApi';
import { CmsPageHeader } from './CmsDrawer';

export const ChurchOverviewPage: React.FC = () => {
  const { organization } = useAuth();
  const [count, setCount] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    // Each list only loads if this church has it on and this role can see it.
    Promise.allSettled<{ isPlaceholder?: boolean }[]>([
      cmsApi.listPages(organization.id).then((result) => result.pages),
      cmsApi.listAnnouncements(organization.id).then((result) => result.announcements),
      cmsApi.listEvents(organization.id).then((result) => result.events),
      cmsApi.listSermons(organization.id).then((result) => result.sermons),
    ])
      .then((results) => {
        const rows = results.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
        setCount(rows.filter((row) => row.isPlaceholder).length);
      })
      .catch((err: Error) => setError(err.message));
  }, [organization.id]);

  const label = count === 1 ? '1 sample item left to replace' : `${count ?? 0} sample items left to replace`;

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Church" description="Website pages, gatherings, sermons, and announcements." />
      {error ? <p className="text-xs text-danger">{error}</p> : null}
      <p className="text-lg font-semibold text-ink">
        {count === null && !error ? 'Counting sample items…' : label}
      </p>
    </div>
  );
};
