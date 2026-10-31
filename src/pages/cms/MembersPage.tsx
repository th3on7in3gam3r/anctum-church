import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { cmsApi, type CmsGroup, type CmsHousehold, type CmsMember, type ImportPlanRow } from '../../services/api/cmsApi';
import { CmsDrawer, CmsListRow, CmsPageHeader, fieldClass, labelClass, primaryButtonClass } from './CmsDrawer';

const STATUSES = ['', 'VISITOR', 'REGULAR', 'MEMBER', 'INACTIVE'] as const;

function parseCsv(text: string) {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const headers = lines[0].split(',').map((cell) => cell.trim().toLowerCase().replace(/\s+/g, ''));
  return lines.slice(1).map((line) => {
    const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
    const value = (...names: string[]) => {
      const index = headers.findIndex((header) => names.includes(header));
      return index >= 0 ? cells[index] || '' : '';
    };
    return {
      firstName: value('firstname', 'first'),
      lastName: value('lastname', 'last'),
      phone: value('phone', 'mobile', 'phonenumber'),
      email: value('email'),
      gender: value('gender'),
      status: value('status'),
      household: value('household', 'family'),
      notes: value('notes'),
    };
  });
}

export const MembersPage: React.FC = () => {
  const { organization } = useAuth();
  const [members, setMembers] = useState<CmsMember[]>([]);
  const [groups, setGroups] = useState<CmsGroup[]>([]);
  const [households, setHouseholds] = useState<CmsHousehold[]>([]);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [groupId, setGroupId] = useState('');
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<Partial<CmsMember> | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'done'>('upload');
  const [importRows, setImportRows] = useState<Array<Record<string, string>>>([]);
  const [preview, setPreview] = useState<ImportPlanRow[]>([]);
  const [importSummary, setImportSummary] = useState('');

  const load = () => {
    cmsApi.listMembers(organization.id, { q, status, groupId }).then((result) => setMembers(result.members)).catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
    cmsApi.listGroups(organization.id).then((result) => setGroups(result.groups)).catch(() => setGroups([]));
    cmsApi.listHouseholds(organization.id).then((result) => setHouseholds(result.households)).catch(() => setHouseholds([]));
  }, [organization.id, q, status, groupId]);

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = Object.fromEntries(form.entries());
    await cmsApi.saveMember(organization.id, editing?.id || null, body);
    setEditing(null);
    load();
  };

  return (
    <div className="space-y-5">
      <CmsPageHeader
        title="Members"
        description="Phone is the primary way to reach people. Email is optional."
        action={
          <div className="flex gap-2">
            <button type="button" className={primaryButtonClass} onClick={() => { setImportOpen(true); setImportStep('upload'); }}>
              Import CSV
            </button>
            <button type="button" className={primaryButtonClass} onClick={() => setEditing({ status: 'VISITOR' })}>
              Add member
            </button>
          </div>
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <input className={fieldClass} placeholder="Search name or phone" value={q} onChange={(event) => setQ(event.target.value)} />
        <select className={fieldClass} value={status} onChange={(event) => setStatus(event.target.value)}>
          {STATUSES.map((item) => <option key={item || 'all'} value={item}>{item || 'All statuses'}</option>)}
        </select>
        <select className={fieldClass} value={groupId} onChange={(event) => setGroupId(event.target.value)}>
          <option value="">All groups</option>
          {groups.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
      <div className="space-y-2">
        {members.map((member) => (
          <CmsListRow key={member.id} onClick={() => setEditing(member)}>
            <p className="text-sm font-bold text-ink">{member.phone || 'No phone yet'}</p>
            <p className="mt-1 text-xs text-muted">
              {member.firstName} {member.lastName} · {member.status.replaceAll('_', ' ')}
              {member.household ? ` · ${member.household.name}` : ''}
            </p>
          </CmsListRow>
        ))}
        {members.length === 0 && <p className="text-sm text-muted">No members match this view.</p>}
      </div>

      <CmsDrawer open={Boolean(editing)} title={editing?.id ? 'Edit member' : 'Add member'} onClose={() => setEditing(null)}>
        {editing && (
          <form className="space-y-3" onSubmit={(event) => void save(event)}>
            <label className={labelClass} htmlFor="firstName">First name</label>
            <input id="firstName" name="firstName" className={fieldClass} defaultValue={editing.firstName || ''} required />
            <label className={labelClass} htmlFor="lastName">Last name</label>
            <input id="lastName" name="lastName" className={fieldClass} defaultValue={editing.lastName || ''} required />
            <label className={labelClass} htmlFor="phone">Phone</label>
            <input id="phone" name="phone" className={fieldClass} defaultValue={editing.phone || ''} inputMode="tel" />
            <label className={labelClass} htmlFor="email">Email</label>
            <input id="email" name="email" className={fieldClass} defaultValue={editing.email || ''} />
            <label className={labelClass} htmlFor="status">Status</label>
            <select id="status" name="status" className={fieldClass} defaultValue={editing.status || 'VISITOR'}>
              {STATUSES.filter(Boolean).map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
            <label className={labelClass} htmlFor="householdId">Household</label>
            <select id="householdId" name="householdId" className={fieldClass} defaultValue={editing.householdId || ''}>
              <option value="">None</option>
              {households.map((household) => <option key={household.id} value={household.id}>{household.name}</option>)}
            </select>
            <label className={labelClass} htmlFor="notes">Notes</label>
            <textarea id="notes" name="notes" className={fieldClass} defaultValue={editing.notes || ''} rows={3} />
            <button className={primaryButtonClass} type="submit">Save member</button>
          </form>
        )}
      </CmsDrawer>

      <CmsDrawer open={importOpen} title="Import members" onClose={() => setImportOpen(false)}>
        {importStep === 'upload' && (
          <div className="space-y-3">
            <p className="text-xs text-muted">CSV columns: firstName, lastName, phone, email, gender, status, household, notes.</p>
            <input
              type="file"
              accept=".csv,text/csv"
              className="text-xs"
              onChange={async (event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                const rows = parseCsv(await file.text());
                setImportRows(rows);
                const result = await cmsApi.previewImport(organization.id, rows);
                setPreview(result.rows);
                setImportStep('preview');
              }}
            />
          </div>
        )}
        {importStep === 'preview' && (
          <div className="space-y-3">
            {preview.map((row, index) => (
              <p key={`${row.phone}-${index}`} className="text-xs text-ink">
                {row.firstName} {row.lastName} · {row.phone || 'no phone'} · {row.action}
                {row.reason ? ` · ${row.reason}` : ''}
              </p>
            ))}
            <button
              type="button"
              className={primaryButtonClass}
              onClick={async () => {
                const result = await cmsApi.commitImport(organization.id, importRows);
                setImportSummary(`Added ${result.inserted}. Skipped ${result.skipped}.`);
                setImportStep('done');
                load();
              }}
            >
              Commit import
            </button>
          </div>
        )}
        {importStep === 'done' && <p className="text-sm font-semibold text-ink">{importSummary}</p>}
      </CmsDrawer>
    </div>
  );
};
