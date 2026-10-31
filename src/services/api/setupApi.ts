import type {
  AccessArea,
  AccessLevel,
  AreaLevels,
  BrandTheme,
  ChurchAccess,
  FeatureDefinition,
  FeatureKey,
  MemberAreaSettings,
  MemberPageDefinition,
  MemberPageKey,
  TermKey,
} from '../../../shared/churchSetup.ts';
import { staffFetch } from './sanctumApi';

export interface SetupRole {
  id: string;
  key: string;
  name: string;
  rank: number;
  canManageSetup: boolean;
  locked: boolean;
  areas: AreaLevels;
  memberCount: number;
  editable: boolean;
}

export interface SetupStaff {
  userId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  rank: number | null;
  isSuperAdmin: boolean;
  isYou: boolean;
}

export interface SetupActivity {
  id: string;
  action: string;
  at: string;
  actorName: string;
  summary: string;
}

export interface SetupSnapshot {
  features: {
    switches: Record<FeatureKey, boolean>;
    effective: Record<FeatureKey, boolean>;
    definitions: FeatureDefinition[];
  };
  brand: {
    name: string;
    appName: string;
    brandTheme: string;
    logoUrl: string;
    terminology: Record<TermKey, string>;
    themes: BrandTheme[];
  };
  memberArea: { settings: MemberAreaSettings; visible: Record<MemberPageKey, boolean>; pages: MemberPageDefinition[] };
  areas: { key: AccessArea; label: string; note: string }[];
  roles: SetupRole[];
  staff: SetupStaff[];
  activity: SetupActivity[];
  you: ChurchAccess & { userId: string };
}

const json = (body: unknown): RequestInit => ({ body: JSON.stringify(body) });

export const setupApi = {
  load: () => staffFetch<SetupSnapshot>('/api/setup'),
  setFeature: (key: FeatureKey, on: boolean) =>
    staffFetch<SetupSnapshot>('/api/setup/features', { method: 'PUT', ...json({ key, on }) }),
  saveBrand: (input: Partial<{ name: string; appName: string; brandTheme: string; logoUrl: string; terminology: Record<string, string> }>) =>
    staffFetch<SetupSnapshot>('/api/setup/brand', { method: 'PUT', ...json(input) }),
  saveMemberArea: (input: { enabled?: boolean; canEditProfile?: boolean; page?: MemberPageKey; on?: boolean }) =>
    staffFetch<SetupSnapshot>('/api/setup/member-area', { method: 'PUT', ...json(input) }),
  createRole: (input: { name: string; canManageSetup?: boolean; areas?: Partial<Record<AccessArea, AccessLevel>> }) =>
    staffFetch<SetupSnapshot>('/api/setup/roles', { method: 'POST', ...json(input) }),
  updateRole: (id: string, input: { name?: string; canManageSetup?: boolean; areas?: Partial<Record<AccessArea, AccessLevel>> }) =>
    staffFetch<SetupSnapshot>(`/api/setup/roles/${encodeURIComponent(id)}`, { method: 'PATCH', ...json(input) }),
  deleteRole: (id: string) => staffFetch<SetupSnapshot>(`/api/setup/roles/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  assignRole: (userId: string, roleId: string) =>
    staffFetch<SetupSnapshot>(`/api/setup/staff/${encodeURIComponent(userId)}/role`, { method: 'PUT', ...json({ roleId }) }),
};

export interface DemoInfo {
  enabled: boolean;
  churchName?: string | null;
  personas: { key: string; name: string; roleName: string; description: string }[];
  members?: { key: string; name: string; roleName: string; description: string }[];
}

export const demoApi = {
  info: async (): Promise<DemoInfo> => {
    const response = await fetch('/api/demo');
    if (!response.ok) return { enabled: false, personas: [] };
    return response.json();
  },
  login: async (persona: string): Promise<string> => {
    const response = await fetch('/api/demo/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ persona }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || typeof body.token !== 'string') throw new Error(body.message || 'Could not sign in to the demo.');
    return body.token;
  },
  reset: async (): Promise<void> => {
    const token = localStorage.getItem('church_demo_token');
    const response = await fetch('/api/demo/reset', { method: 'POST', headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.message || 'Could not reset the demo.');
  },
};
