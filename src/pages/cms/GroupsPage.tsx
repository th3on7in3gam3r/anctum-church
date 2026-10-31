import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsGroup, type CmsMember } from '../../services/api/cmsApi';
import { LEADER_UNLINKED_MESSAGE, huddleAccess } from '../../../shared/huddle.ts';
import { CmsDrawer, CmsPageHeader, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

const TYPES = ['MINISTRY', 'CELL', 'DEPARTMENT', 'CHOIR', 'OTHER'];

export const GroupsPage: React.FC = () => {
  const { organization, user } = useAuth();
  const [groups, setGroups] = useState<CmsGroup[]>([]);
  const [members, setMembers] = useState<CmsMember[]>([]);
  const [editing, setEditing] = useState<Partial<CmsGroup> | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = () => {
    cmsApi.listGroups(organization.id).then((result) => setGroups(result.groups)).catch((err: Error) => setError(err.message));
    cmsApi.listMembers(organization.id, {}).then((result) => setMembers(result.members)).catch(() => setMembers([]));
  };
  useEffect(load, [organization.id]);

  return (
    <div className="space-y-5">
      <CmsPageHeader title="Groups" description="Ministries, cells, departments, and choirs." action={<button type="button" className={primaryButtonClass} onClick={() => setEditing({ type: 'CELL' })}>Add group</button>} />
      {error && <p className="text-xs text-danger">{error}</p>}
      {notice && <p className="text-xs text-green">{notice}</p>}
      <div className="space-y-2">
        {groups.map((group) => {
          const access = huddleAccess({
            orgRole: user?.role,
            actorUserId: user?.id,
            leaderUserId: group.leader?.userId,
          });
          return (
          <div key={group.id} className="ui-card p-4 text-left">
            <button type="button" className="w-full cursor-pointer text-left" onClick={() => setEditing(group)}>
            <p className="text-sm font-bold text-ink">{group.name}</p>
            <p className="mt-1 text-xs text-muted">{group.type} · {group.members.length} people{group.leader ? ` · led by ${group.leader.firstName} ${group.leader.lastName}` : ''}</p>
            </button>
            {access === 'unlinked' && user?.role !== 'MEDIA' ? (
              <p className="mt-2 text-xs text-gold">{LEADER_UNLINKED_MESSAGE}</p>
            ) : null}
            {access === 'allow' ? (
              <button
                type="button"
                className={`${primaryButtonClass} mt-3`}
                onClick={async () => {
                  setError('');
                  setNotice('');
                  try {
                    const started = await cmsApi.startHuddle(organization.id, group.id);
                    setNotice(`${started.room.name} is ready at /join/${started.room.slug}`);
                  } catch (err) {
                    setError(err instanceof Error ? err.message : LEADER_UNLINKED_MESSAGE);
                  }
                }}
              >
                Start a huddle room
              </button>
            ) : null}
          </div>
          );
        })}
      </div>
      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit group' : 'Add group'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={async (event) => {
            event.preventDefault();
            const body = Object.fromEntries(new FormData(event.currentTarget).entries());
            const saved = await cmsApi.saveGroup(organization.id, editing.id || null, {
              ...body,
              showOnWebsite: body.showOnWebsite === 'on',
              sortOrder: Number(body.sortOrder || 0),
            });
            setEditing(saved.group);
            load();
          }}>
            <label className={labelClass} htmlFor="name">Name</label>
            <input id="name" name="name" className={fieldClass} defaultValue={editing.name || ''} required />
            <label className={labelClass} htmlFor="type">Type</label>
            <select id="type" name="type" className={fieldClass} defaultValue={editing.type || 'OTHER'}>
              {TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
            </select>
            <label className={labelClass} htmlFor="leaderMemberId">Leader</label>
            <select id="leaderMemberId" name="leaderMemberId" className={fieldClass} defaultValue={editing.leaderMemberId || ''}>
              <option value="">No leader</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
            </select>
            <label className={labelClass} htmlFor="description">Private notes</label>
            <textarea id="description" name="description" className={fieldClass} defaultValue={editing.description || ''} rows={3} />
            <label className="flex items-center gap-2 text-xs font-semibold" htmlFor="showOnWebsite">
              <input id="showOnWebsite" name="showOnWebsite" type="checkbox" defaultChecked={Boolean(editing.showOnWebsite)} />
              Show on the website
            </label>
            <label className={labelClass} htmlFor="publicDescription">Website description</label>
            <textarea id="publicDescription" name="publicDescription" className={fieldClass} defaultValue={editing.publicDescription || ''} rows={3} />
            <label className={labelClass} htmlFor="meetingTime">Meeting time</label>
            <input id="meetingTime" name="meetingTime" className={fieldClass} defaultValue={editing.meetingTime || ''} />
            <label className={labelClass} htmlFor="imageUrl">Photo address</label>
            <input id="imageUrl" name="imageUrl" className={fieldClass} defaultValue={editing.imageUrl || ''} />
            <label className={labelClass} htmlFor="sortOrder">Order</label>
            <input id="sortOrder" name="sortOrder" type="number" min={0} className={fieldClass} defaultValue={editing.sortOrder ?? 0} />
            <button className={primaryButtonClass} type="submit">Save group</button>
          </form>
        )}
        {editing?.id && (
          <div className="mt-6 space-y-2">
            <p className={labelClass}>People in this group</p>
            {editing.members?.map((row) => (
              <div key={row.member.id} className="flex items-center justify-between text-xs">
                <span>{row.member.firstName} {row.member.lastName} · {row.member.phone || 'No phone'}</span>
                <button type="button" className="text-danger cursor-pointer" onClick={async () => {
                  await cmsApi.removeGroupMember(organization.id, editing.id!, row.member.id);
                  const next = await cmsApi.listGroups(organization.id);
                  setGroups(next.groups);
                  setEditing(next.groups.find((group) => group.id === editing.id) || null);
                }}>Remove</button>
              </div>
            ))}
            <select className={fieldClass} defaultValue="" onChange={async (event) => {
              const memberId = event.target.value;
              if (!memberId || !editing.id) return;
              await cmsApi.addGroupMember(organization.id, editing.id, { memberId, role: 'MEMBER' });
              event.target.value = '';
              const next = await cmsApi.listGroups(organization.id);
              setGroups(next.groups);
              setEditing(next.groups.find((group) => group.id === editing.id) || null);
            }}>
              <option value="">Add a member</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.firstName} {member.lastName}</option>)}
            </select>
          </div>
        )}
      </CmsDrawer>
    </div>
  );
};
