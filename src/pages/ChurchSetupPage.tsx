import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Lock, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { CmsPageHeader, fieldClass, labelClass, primaryButtonClass } from './cms/CmsDrawer';
import { setupApi, type SetupRole, type SetupSnapshot } from '../services/api/setupApi';
import {
  ACCESS_LEVEL_LABELS,
  TERM_KEYS,
  TERM_LABELS,
  canAssignRole,
  dependentsOf,
  type AccessArea,
  type AccessLevel,
  type FeatureDefinition,
  type FeatureKey,
} from '../../shared/churchSetup.ts';
import { cn } from '../lib/utils';

type Tab = 'features' | 'brand' | 'roles' | 'staff' | 'activity';

const TABS: { key: Tab; label: string }[] = [
  { key: 'features', label: 'Features' },
  { key: 'brand', label: 'Brand' },
  { key: 'roles', label: 'Roles & access' },
  { key: 'staff', label: 'Staff' },
  { key: 'activity', label: 'Activity log' },
];

function messageFrom(error: unknown): string {
  if (error && typeof error === 'object') {
    const fieldErrors = (error as { fieldErrors?: Record<string, string> | null }).fieldErrors;
    if (fieldErrors && Object.values(fieldErrors)[0]) return Object.values(fieldErrors)[0];
    if (error instanceof Error) return error.message;
  }
  return 'Something went wrong. Try again.';
}

const Switch: React.FC<{ on: boolean; label: string; disabled?: boolean; onChange: () => void }> = ({ on, label, disabled, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={on}
    aria-label={label}
    disabled={disabled}
    onClick={onChange}
    className={cn(
      'relative inline-flex h-8 w-14 shrink-0 items-center rounded-full p-1 transition-colors',
      on ? 'bg-green dark:bg-gold justify-end' : 'bg-[#CFD2CB] dark:bg-[#3A4A43] justify-start',
      disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
    )}
  >
    <span className="h-6 w-6 rounded-full bg-white shadow" />
  </button>
);

export const ChurchSetupPage: React.FC<{ initialTab?: Tab }> = ({ initialTab = 'features' }) => {
  const { refreshAuth } = useAuth();
  const { confirmAction } = useApp();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [data, setData] = useState<SetupSnapshot | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setupApi.load().then(setData).catch((err) => setError(messageFrom(err)));
  }, []);

  /** Runs a change, shows the result, and refreshes the menu and colors when they may have changed. */
  const run = useCallback(
    async (action: () => Promise<SetupSnapshot>, success: string, refreshNav = false) => {
      setBusy(true);
      setError('');
      setNotice('');
      try {
        const next = await action();
        setData(next);
        setNotice(success);
        if (refreshNav) await refreshAuth();
      } catch (err) {
        setError(messageFrom(err));
      } finally {
        setBusy(false);
      }
    },
    [refreshAuth]
  );

  return (
    <div className="space-y-5">
      <CmsPageHeader
        title="Church setup"
        description="Choose what your church uses, how it looks, and who can do what. Every change is saved in the activity log."
      />

      <div role="tablist" aria-label="Church setup sections" className="flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              'min-h-11 rounded-full px-4 text-sm font-bold cursor-pointer border',
              tab === item.key ? 'ui-nav-active border-transparent' : 'border-line bg-card text-ink hover:bg-black/5 dark:hover:bg-white/5'
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div aria-live="polite" className="min-h-5">
        {error ? <p className="rounded-xl border border-danger/30 bg-red-500/10 px-3 py-2 text-sm font-semibold text-danger">{error}</p> : null}
        {!error && notice ? <p className="rounded-xl border border-green/30 bg-green/10 px-3 py-2 text-sm font-semibold text-ink">{notice}</p> : null}
      </div>

      {!data ? (
        error ? null : <p className="text-sm text-muted">Loading church setup…</p>
      ) : tab === 'features' ? (
        <FeaturesTab data={data} busy={busy} run={run} confirmAction={confirmAction} />
      ) : tab === 'brand' ? (
        <BrandTab data={data} busy={busy} run={run} />
      ) : tab === 'roles' ? (
        <RolesTab data={data} busy={busy} run={run} confirmAction={confirmAction} />
      ) : tab === 'staff' ? (
        <StaffTab data={data} busy={busy} run={run} />
      ) : (
        <ActivityTab data={data} />
      )}
    </div>
  );
};

type RunFn = (action: () => Promise<SetupSnapshot>, success: string, refreshNav?: boolean) => Promise<void>;
type ConfirmFn = ReturnType<typeof useApp>['confirmAction'];

// ---------------------------------------------------------------- features

const FeaturesTab: React.FC<{ data: SetupSnapshot; busy: boolean; run: RunFn; confirmAction: ConfirmFn }> = ({ data, busy, run, confirmAction }) => {
  const { switches, definitions } = data.features;
  const label = (key: FeatureKey) => definitions.find((item) => item.key === key)?.label || key;
  const groups = useMemo(() => {
    const out: { name: string; items: FeatureDefinition[] }[] = [];
    for (const feature of definitions) {
      let group = out.find((item) => item.name === feature.group);
      if (!group) {
        group = { name: feature.group, items: [] };
        out.push(group);
      }
      group.items.push(feature);
    }
    return out;
  }, [definitions]);
  const onCount = definitions.filter((feature) => data.features.effective[feature.key]).length;
  const readyCount = definitions.filter((feature) => feature.status === 'ready').length;

  const toggle = (feature: FeatureDefinition) => {
    const turningOn = !switches[feature.key];
    const save = () => run(() => setupApi.setFeature(feature.key, turningOn), `${feature.label} is now ${turningOn ? 'on' : 'off'}.`, true);
    if (turningOn) {
      void save();
      return;
    }
    const dependents = dependentsOf(feature.key, switches);
    if (!feature.major && dependents.length === 0) {
      void save();
      return;
    }
    confirmAction({
      title: `Turn off ${feature.label}?`,
      description: [
        'Staff will stop seeing it straight away.',
        dependents.length ? `This also turns off: ${dependents.map(label).join(', ')}.` : '',
        'Nothing is deleted — turn it back on any time and everything is still there.',
      ]
        .filter(Boolean)
        .join(' '),
      confirmText: 'Turn off',
      cancelText: 'Keep it on',
      isDestructive: true,
      onConfirm: save,
    });
  };

  return (
    <div className="space-y-4">
      <p className="text-sm font-semibold text-ink">
        {onCount} of {readyCount} available features on
      </p>
      {groups.map((group) => (
        <section key={group.name} className="ui-card px-5 py-2">
          <h2 className="pt-3 pb-1 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">{group.name}</h2>
          {group.items.map((feature) => {
            const soon = feature.status === 'soon';
            const missing = (feature.needs || []).filter((need) => !switches[need]);
            const blocked = !switches[feature.key] && missing.length > 0;
            return (
              <div key={feature.key} className="flex items-center gap-4 border-t border-line py-3.5 first-of-type:border-t-0">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                    {feature.label}
                    {soon ? <span className="rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink dark:text-gold">Coming soon</span> : null}
                  </p>
                  <p className="text-sm text-muted">{feature.description}</p>
                  {!soon && blocked ? (
                    <p className="mt-0.5 text-xs font-bold text-gold-ink dark:text-gold">Needs {missing.map(label).join(' and ')} turned on first</p>
                  ) : null}
                </div>
                <Switch
                  on={!soon && switches[feature.key]}
                  label={feature.label}
                  disabled={busy || soon || blocked}
                  onChange={() => toggle(feature)}
                />
              </div>
            );
          })}
        </section>
      ))}
    </div>
  );
};

// ---------------------------------------------------------------- brand

const BrandTab: React.FC<{ data: SetupSnapshot; busy: boolean; run: RunFn }> = ({ data, busy, run }) => {
  const [name, setName] = useState(data.brand.name);
  const [appName, setAppName] = useState(data.brand.appName);
  const [logoUrl, setLogoUrl] = useState(data.brand.logoUrl);
  const [themeKey, setThemeKey] = useState(data.brand.brandTheme);
  const [terms, setTerms] = useState<Record<string, string>>(data.brand.terminology);
  const theme = data.brand.themes.find((item) => item.key === themeKey) || data.brand.themes[0];
  const shownApp = appName.trim() || name;

  const save = (event: React.FormEvent) => {
    event.preventDefault();
    void run(
      () => setupApi.saveBrand({ name: name.trim(), appName: appName.trim(), logoUrl: logoUrl.trim(), brandTheme: themeKey, terminology: terms }),
      'Brand saved. The new name and colors are live for everyone.',
      true
    );
  };

  return (
    <form onSubmit={save} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
      <div className="space-y-5">
        <div className="ui-card space-y-4 p-5">
          <label className="block">
            <span className={labelClass}>Church name</span>
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} />
          </label>
          <div>
            <label htmlFor="brand-app-name" className={labelClass}>App name (optional)</label>
            <input id="brand-app-name" aria-describedby="brand-app-name-hint" className={fieldClass} value={appName} placeholder="e.g. Church Hub" onChange={(event) => setAppName(event.target.value)} maxLength={40} />
            <p id="brand-app-name-hint" className="mt-1 text-xs text-muted">Shown at the top of the app. Leave empty to use the church name.</p>
          </div>
          <div>
            <label htmlFor="brand-logo" className={labelClass}>Logo web address (optional)</label>
            <input id="brand-logo" aria-describedby="brand-logo-hint" className={fieldClass} type="url" value={logoUrl} placeholder="https://…/logo.png" onChange={(event) => setLogoUrl(event.target.value)} />
            <p id="brand-logo-hint" className="mt-1 text-xs text-muted">A square PNG or SVG works best.</p>
          </div>
        </div>

        <fieldset className="ui-card p-5">
          <legend className={cn(labelClass, 'px-1')}>Colors</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {data.brand.themes.map((item) => (
              <button
                key={item.key}
                type="button"
                aria-pressed={item.key === themeKey}
                onClick={() => setThemeKey(item.key)}
                className={cn(
                  'flex min-h-11 flex-col items-start gap-2 rounded-xl bg-card p-3 text-left cursor-pointer',
                  item.key === themeKey ? 'border-2 border-ink' : 'border border-line'
                )}
              >
                <span className="flex gap-1">
                  <span className="h-7 w-7 rounded-lg" style={{ background: item.primary }} />
                  <span className="h-7 w-7 rounded-lg" style={{ background: item.accent }} />
                </span>
                <span className="text-sm font-bold text-ink">{item.name}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">Text colors are chosen for you so everything stays easy to read.</p>
        </fieldset>

        <fieldset className="ui-card space-y-3 p-5">
          <legend className={cn(labelClass, 'px-1')}>Words your church uses</legend>
          {TERM_KEYS.map((key) => (
            <label key={key} className="grid items-center gap-2 sm:grid-cols-[1fr_220px]">
              <span className="text-sm text-muted">{TERM_LABELS[key].label}</span>
              <input
                className={fieldClass}
                value={terms[key] || ''}
                placeholder={TERM_LABELS[key].fallback}
                maxLength={40}
                onChange={(event) => setTerms((prev) => ({ ...prev, [key]: event.target.value }))}
              />
            </label>
          ))}
        </fieldset>

        <button type="submit" className={cn(primaryButtonClass, 'w-full sm:w-auto')} disabled={busy}>
          {busy ? 'Saving…' : 'Save brand'}
        </button>
      </div>

      <aside aria-label="Preview" className="space-y-3 lg:sticky lg:top-6 lg:self-start">
        <p className={labelClass}>Preview</p>
        <div className="overflow-hidden rounded-2xl border border-line">
          <div className="flex items-center gap-3 px-4 py-3 text-white" style={{ background: theme.primary }}>
            {logoUrl ? <img src={logoUrl} alt="" className="h-8 w-8 rounded-lg object-cover" /> : <span className="h-8 w-8 rounded-lg" style={{ background: theme.accent }} />}
            <span className="font-display text-lg">{shownApp || 'Your church'}</span>
          </div>
          <div className="space-y-3 p-4" style={{ background: '#F8F7F3' }}>
            <div className="space-y-2 rounded-xl p-4 text-white" style={{ background: theme.primary }}>
              <p className="text-[11px] font-bold uppercase tracking-wide opacity-80">Sunday</p>
              <p className="font-display text-xl">Good morning, Pastor.</p>
              <span className="inline-block rounded-lg px-3 py-2 text-sm font-bold text-[#16251F]" style={{ background: theme.accent }}>
                Review prayer requests
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
              {[terms.members || 'Members', terms.smallGroups || 'Groups', terms.tithe || 'Tithe'].map((word) => (
                <span key={word} className="rounded-xl border px-2 py-3" style={{ color: theme.primary, background: '#FFFFFF', borderColor: '#E5E6E1' }}>
                  {word}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted">The same name and colors show in the staff app and on shared prayer links.</p>
      </aside>
    </form>
  );
};

// ---------------------------------------------------------------- roles

const RolesTab: React.FC<{ data: SetupSnapshot; busy: boolean; run: RunFn; confirmAction: ConfirmFn }> = ({ data, busy, run, confirmAction }) => {
  const [selectedId, setSelectedId] = useState<string>(() => data.roles.find((role) => role.editable)?.id || data.roles[0]?.id || '');
  const [newName, setNewName] = useState('');
  const role = data.roles.find((item) => item.id === selectedId) || data.roles[0];
  const [rename, setRename] = useState(role?.name || '');
  useEffect(() => setRename(role?.name || ''), [role?.id, role?.name]);
  const superCount = data.staff.filter((person) => person.isSuperAdmin).length;

  if (!role) return null;
  const lockReason = role.locked
    ? 'The Super Admin role always has full access. Nobody can change it.'
    : role.id === data.you.roleId
      ? 'This is your own role. Only someone ranked above you can change it.'
      : !role.editable
        ? 'This role is ranked at or above yours, so you can’t change it.'
        : '';

  const setLevel = (area: AccessArea, level: AccessLevel) => {
    if (!role.editable || role.areas[area] === level) return;
    void run(() => setupApi.updateRole(role.id, { areas: { [area]: level } }), `${role.name} updated.`);
  };

  const addRole = (event: React.FormEvent) => {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    void run(async () => {
      const next = await setupApi.createRole({ name });
      const created = next.roles.find((item) => item.name === name);
      if (created) setSelectedId(created.id);
      setNewName('');
      return next;
    }, `${name} created. Set what it can open below.`);
  };

  const remove = (target: SetupRole) => {
    confirmAction({
      title: `Delete the ${target.name} role?`,
      description: 'Nobody has this role, so nobody loses access. This is saved in the activity log.',
      confirmText: 'Delete role',
      cancelText: 'Keep it',
      isDestructive: true,
      onConfirm: () =>
        run(async () => {
          const next = await setupApi.deleteRole(target.id);
          setSelectedId(next.roles[0]?.id || '');
          return next;
        }, `${target.name} deleted.`),
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-full bg-green/10 px-3 py-1.5 text-ink">
          {superCount} Super Admin{superCount === 1 ? '' : 's'} · the last one can never be removed
        </span>
        <span className="rounded-full bg-gold/20 px-3 py-1.5 text-ink">You can only change roles ranked below yours ({data.you.roleName})</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
        <div className="space-y-3">
          <div role="listbox" aria-label="Roles" className="ui-card space-y-1 p-2">
            {data.roles.map((item) => (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={item.id === role.id}
                onClick={() => setSelectedId(item.id)}
                className={cn(
                  'flex min-h-12 w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left cursor-pointer',
                  item.id === role.id ? 'ui-nav-active' : 'text-ink hover:bg-black/5 dark:hover:bg-white/5'
                )}
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-bold">{item.name}</span>
                  <span className={cn('block text-xs', item.id === role.id ? 'opacity-80' : 'text-muted')}>
                    {item.memberCount} {item.memberCount === 1 ? 'person' : 'people'} · rank {item.rank}
                  </span>
                </span>
                {item.editable ? null : <Lock aria-label="Locked" className="h-4 w-4 shrink-0" />}
              </button>
            ))}
          </div>
          <form onSubmit={addRole} className="ui-card space-y-2 p-3">
            <label className="block">
              <span className={labelClass}>New role</span>
              <input className={fieldClass} value={newName} placeholder="e.g. Usher" maxLength={40} onChange={(event) => setNewName(event.target.value)} />
            </label>
            <button type="submit" className={cn(primaryButtonClass, 'w-full gap-1.5')} disabled={busy || !newName.trim()}>
              <Plus className="h-4 w-4" /> Create role
            </button>
            <p className="text-xs text-muted">New roles start with no access and rank just below yours.</p>
          </form>
        </div>

        <section className="ui-card min-w-0 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {role.editable ? (
              <form
                className="flex flex-1 flex-wrap items-center gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (rename.trim() && rename.trim() !== role.name) {
                    void run(() => setupApi.updateRole(role.id, { name: rename.trim() }), 'Role renamed.');
                  }
                }}
              >
                <label className="min-w-0 flex-1">
                  <span className="sr-only">Role name</span>
                  <input className={cn(fieldClass, 'text-lg font-extrabold')} value={rename} maxLength={40} onChange={(event) => setRename(event.target.value)} />
                </label>
                {rename.trim() && rename.trim() !== role.name ? (
                  <button type="submit" className={primaryButtonClass} disabled={busy}>Rename</button>
                ) : null}
              </form>
            ) : (
              <h2 className="text-xl font-extrabold text-ink">{role.name}</h2>
            )}
            {role.editable && role.memberCount === 0 ? (
              <button
                type="button"
                onClick={() => remove(role)}
                disabled={busy}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-danger/40 px-3 text-sm font-bold text-danger cursor-pointer hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            ) : null}
          </div>

          {lockReason ? (
            <p className="rounded-xl border border-gold/50 bg-soft/50 px-3 py-2 text-sm font-semibold text-ink">{lockReason}</p>
          ) : null}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse">
              <thead>
                <tr className="text-left text-xs text-muted">
                  <th scope="col" className="py-2 pr-3 font-semibold">Area</th>
                  <th scope="col" className="py-2 font-semibold">Access</th>
                </tr>
              </thead>
              <tbody>
                {data.areas.map((area) => (
                  <tr key={area.key} className="border-t border-line">
                    <th scope="row" className="w-52 py-3 pr-3 text-left align-middle">
                      <span className="block text-sm font-bold text-ink">{area.label}</span>
                      <span className="block text-xs font-normal text-muted">{area.note}</span>
                    </th>
                    <td className="py-3">
                      <div role="radiogroup" aria-label={area.label} className="flex flex-wrap gap-1.5">
                        {ACCESS_LEVEL_LABELS.map((levelLabel, index) => {
                          const level = index as AccessLevel;
                          const on = role.areas[area.key] === level;
                          return (
                            <button
                              key={levelLabel}
                              type="button"
                              role="radio"
                              aria-checked={on}
                              disabled={busy || !role.editable}
                              onClick={() => setLevel(area.key, level)}
                              className={cn(
                                'min-h-10 rounded-full px-3.5 text-sm font-bold',
                                on ? 'ui-nav-active' : 'border border-line bg-card text-ink',
                                !role.editable ? (on ? 'cursor-not-allowed' : 'cursor-not-allowed opacity-40') : 'cursor-pointer'
                              )}
                            >
                              {levelLabel}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                ))}
                <tr className="border-t-2 border-gold/50 bg-soft/30">
                  <th scope="row" className="py-3 pr-3 text-left">
                    <span className="block text-sm font-bold text-ink">Manage church setup</span>
                    <span className="block text-xs font-normal text-muted">Features, brand, roles and staff roles</span>
                  </th>
                  <td className="py-3">
                    <Switch
                      on={role.canManageSetup}
                      label="Manage church setup"
                      disabled={busy || !role.editable}
                      onChange={() =>
                        void run(
                          () => setupApi.updateRole(role.id, { canManageSetup: !role.canManageSetup }),
                          role.canManageSetup ? `${role.name} can no longer manage church setup.` : `${role.name} can now manage church setup.`
                        )
                      }
                    />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            View lets someone read. Edit lets them add and change. Approve adds sign-off steps like publishing albums.
          </p>
        </section>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- staff

const StaffTab: React.FC<{ data: SetupSnapshot; busy: boolean; run: RunFn }> = ({ data, busy, run }) => {
  const you = data.you;
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        Give each staff member a role. You can only give roles ranked below yours, and the church always keeps at least one Super Admin.
      </p>
      <div className="ui-card overflow-x-auto">
        <table className="w-full min-w-[560px] border-collapse text-sm">
          <thead>
            <tr className="text-left text-xs text-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Name</th>
              <th scope="col" className="px-4 py-3 font-semibold">Email</th>
              <th scope="col" className="px-4 py-3 font-semibold">Role</th>
            </tr>
          </thead>
          <tbody>
            {data.staff.map((person) => {
              const lockedReason = person.isYou
                ? 'You can’t change your own role.'
                : !you.isSuperAdmin && person.rank !== null && person.rank <= you.rank
                  ? 'Ranked at or above you.'
                  : '';
              return (
                <tr key={person.userId} className="border-t border-line">
                  <td className="px-4 py-3 font-bold text-ink">
                    {person.name} {person.isYou ? <span className="ml-1 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold">You</span> : null}
                  </td>
                  <td className="px-4 py-3 text-muted">{person.email}</td>
                  <td className="px-4 py-3">
                    <label className="block">
                      <span className="sr-only">Role for {person.name}</span>
                      <select
                        className={cn(fieldClass, 'min-h-11')}
                        value={person.roleId || ''}
                        disabled={busy || Boolean(lockedReason)}
                        onChange={(event) => {
                          const role = data.roles.find((item) => item.id === event.target.value);
                          if (role) void run(() => setupApi.assignRole(person.userId, role.id), `${person.name} is now ${role.name}.`);
                        }}
                      >
                        {person.roleId ? null : <option value="">No role</option>}
                        {data.roles.map((role) => {
                          const allowed = canAssignRole(you, you.userId, { userId: person.userId, currentRank: person.rank }, role);
                          return (
                            <option key={role.id} value={role.id} disabled={!allowed.ok && role.id !== person.roleId}>
                              {role.name}
                            </option>
                          );
                        })}
                      </select>
                    </label>
                    {lockedReason ? <span className="mt-1 block text-xs text-muted">{lockedReason}</span> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------- activity

const ActivityTab: React.FC<{ data: SetupSnapshot }> = ({ data }) => (
  <div className="ui-card divide-y divide-line">
    {data.activity.length === 0 ? <p className="p-4 text-sm text-muted">No setup changes yet.</p> : null}
    {data.activity.map((item) => (
      <div key={item.id} className="flex flex-col gap-0.5 px-4 py-3 sm:flex-row sm:gap-4">
        <time dateTime={item.at} className="w-44 shrink-0 text-xs text-muted">
          {new Date(item.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </time>
        <p className="text-sm text-ink">
          <span className="font-bold">{item.actorName}</span> · {item.summary}
        </p>
      </div>
    ))}
  </div>
);
