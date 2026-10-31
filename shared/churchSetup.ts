/**
 * Church setup: the switches, brand and roles each church controls for itself.
 * Pure data and rules, shared by the API and the staff app so both agree.
 */
import type { OrganizationRole } from './roles.ts';

// ---------------------------------------------------------------- features

export type FeatureKey =
  | 'members'
  | 'visitors'
  | 'greetings'
  | 'giving'
  | 'counting'
  | 'fundraisers'
  | 'budgets'
  | 'events'
  | 'attendance'
  | 'kidsCheckin'
  | 'prayerRooms'
  | 'prayerRequests'
  | 'sermons'
  | 'gallery'
  | 'announcements'
  | 'website';

export interface FeatureDefinition {
  key: FeatureKey;
  group: 'People' | 'Giving & finance' | 'Gatherings' | 'Prayer & media' | 'Communication & website';
  label: string;
  description: string;
  /** Features that must be on for this one to work. */
  needs?: FeatureKey[];
  /** A big switch: turning it off asks for confirmation. */
  major?: boolean;
  /** Shipped and usable today, or shown as coming next. */
  status: 'ready' | 'soon';
  defaultOn: boolean;
}

export const FEATURES: readonly FeatureDefinition[] = [
  { key: 'members', group: 'People', label: 'Members & households', description: 'Profiles, families, ministries and groups', major: true, status: 'ready', defaultOn: true },
  { key: 'visitors', group: 'People', label: 'Visitor cards & follow-ups', description: 'New people from the website and Sunday cards', status: 'ready', defaultOn: true },
  { key: 'greetings', group: 'People', label: 'Birthday & anniversary greetings', description: "The pastor's card by app, text and email", needs: ['members'], status: 'soon', defaultOn: false },
  { key: 'giving', group: 'Giving & finance', label: 'Online giving', description: 'Mobile money and card through your payment account', major: true, status: 'soon', defaultOn: false },
  { key: 'counting', group: 'Giving & finance', label: 'Cash counting', description: 'Two counters sign before cash posts', needs: ['giving'], status: 'soon', defaultOn: false },
  { key: 'fundraisers', group: 'Giving & finance', label: 'Fundraisers & pledges', description: 'Building fund, campaigns and who still owes', needs: ['giving'], status: 'soon', defaultOn: false },
  { key: 'budgets', group: 'Giving & finance', label: 'Expenses & budgets', description: 'Spending, approvals and monthly budgets', status: 'soon', defaultOn: false },
  { key: 'events', group: 'Gatherings', label: 'Events & RSVPs', description: 'Public RSVP on the website', status: 'ready', defaultOn: true },
  { key: 'attendance', group: 'Gatherings', label: 'Attendance', description: 'Service counts and who came', status: 'soon', defaultOn: false },
  { key: 'kidsCheckin', group: 'Gatherings', label: 'Kids check-in', description: 'Rotating QR at the door, pickup confirmation', needs: ['members'], status: 'soon', defaultOn: false },
  { key: 'prayerRooms', group: 'Prayer & media', label: 'Live prayer rooms', description: 'Live prayer anyone can join from a link', status: 'ready', defaultOn: true },
  { key: 'prayerRequests', group: 'Prayer & media', label: 'Prayer requests', description: 'Requests from prayer rooms, read by the prayer team', needs: ['prayerRooms'], status: 'ready', defaultOn: true },
  { key: 'sermons', group: 'Prayer & media', label: 'Sermons', description: 'Messages imported from your YouTube channel', status: 'ready', defaultOn: true },
  { key: 'gallery', group: 'Prayer & media', label: 'Photo & video gallery', description: 'Albums with photo consent and review', status: 'ready', defaultOn: true },
  { key: 'announcements', group: 'Communication & website', label: 'Announcements', description: 'News on the website and in the app', status: 'ready', defaultOn: true },
  { key: 'website', group: 'Communication & website', label: 'Website pages', description: 'About, beliefs, leaders and visit questions', status: 'ready', defaultOn: true },
];

const FEATURE_KEYS = new Set<string>(FEATURES.map((feature) => feature.key));

export function isFeatureKey(value: unknown): value is FeatureKey {
  return typeof value === 'string' && FEATURE_KEYS.has(value);
}

export function featureDefinition(key: FeatureKey): FeatureDefinition {
  const found = FEATURES.find((feature) => feature.key === key);
  if (!found) throw new Error(`Unknown feature ${key}`);
  return found;
}

export type FeatureSwitches = Partial<Record<FeatureKey, boolean>>;

/** The church's own choices, with defaults filled in. */
export function storedFeatureSwitches(raw: unknown): Record<FeatureKey, boolean> {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<FeatureKey, boolean>;
  for (const feature of FEATURES) {
    const value = source[feature.key];
    out[feature.key] = typeof value === 'boolean' ? value : feature.defaultOn;
  }
  return out;
}

/** What is actually on: a feature only counts as on when everything it needs is on, and it has shipped. */
export function effectiveFeatures(raw: unknown): Record<FeatureKey, boolean> {
  const stored = storedFeatureSwitches(raw);
  const out = {} as Record<FeatureKey, boolean>;
  const resolve = (key: FeatureKey, seen: Set<FeatureKey>): boolean => {
    if (key in out) return out[key];
    if (seen.has(key)) return false;
    seen.add(key);
    const feature = featureDefinition(key);
    const on = feature.status === 'ready' && stored[key] && (feature.needs || []).every((need) => resolve(need, seen));
    out[key] = on;
    return on;
  };
  for (const feature of FEATURES) resolve(feature.key, new Set());
  return out;
}

/** Everything that is switched on and depends on `key`, directly or through another feature. */
export function dependentsOf(key: FeatureKey, switches: Record<FeatureKey, boolean>): FeatureKey[] {
  const out: FeatureKey[] = [];
  const visit = (parent: FeatureKey) => {
    for (const feature of FEATURES) {
      if (feature.needs?.includes(parent) && switches[feature.key] && !out.includes(feature.key)) {
        out.push(feature.key);
        visit(feature.key);
      }
    }
  };
  visit(key);
  return out;
}

/** Turning one off also turns off what depends on it, so nothing is left half on. */
export function applyFeatureChange(
  current: Record<FeatureKey, boolean>,
  key: FeatureKey,
  on: boolean
): { next: Record<FeatureKey, boolean>; alsoTurnedOff: FeatureKey[]; missing: FeatureKey[] } {
  const next = { ...current };
  if (on) {
    const missing = (featureDefinition(key).needs || []).filter((need) => !current[need]);
    if (missing.length) return { next: current, alsoTurnedOff: [], missing };
    next[key] = true;
    return { next, alsoTurnedOff: [], missing: [] };
  }
  const dependents = dependentsOf(key, current);
  next[key] = false;
  for (const dependent of dependents) next[dependent] = false;
  return { next, alsoTurnedOff: dependents, missing: [] };
}

// ---------------------------------------------------------------- access

export type AccessArea = 'people' | 'giving' | 'events' | 'kids' | 'prayer' | 'media' | 'website' | 'communication';
export type AccessLevel = 0 | 1 | 2 | 3;
export const ACCESS_LEVEL_LABELS = ['None', 'View', 'Edit', 'Approve'] as const;

export const AREAS: readonly { key: AccessArea; label: string; note: string }[] = [
  { key: 'people', label: 'People', note: 'Members, families, groups, visitors' },
  { key: 'giving', label: 'Giving & finance', note: 'Gifts, counting, budgets' },
  { key: 'events', label: 'Events', note: 'Events and RSVPs' },
  { key: 'kids', label: 'Kids check-in', note: 'Rooms and pickups' },
  { key: 'prayer', label: 'Prayer', note: 'Prayer rooms and requests' },
  { key: 'media', label: 'Sermons & gallery', note: 'Messages, photos, videos' },
  { key: 'website', label: 'Website', note: 'Pages, leaders, visit questions' },
  { key: 'communication', label: 'Announcements', note: 'News and alerts' },
];

const AREA_KEYS = new Set<string>(AREAS.map((area) => area.key));

export function isAccessArea(value: unknown): value is AccessArea {
  return typeof value === 'string' && AREA_KEYS.has(value);
}

export type AreaLevels = Record<AccessArea, AccessLevel>;

export function normalizeAreaLevels(raw: unknown): AreaLevels {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as AreaLevels;
  for (const area of AREAS) {
    const value = source[area.key];
    out[area.key] = value === 1 || value === 2 || value === 3 ? value : 0;
  }
  return out;
}

export interface RolePreset {
  key: string;
  name: string;
  rank: number;
  canManageSetup: boolean;
  /** Locked presets cannot be edited or deleted by anyone. */
  locked?: boolean;
  areas: AreaLevels;
}

const levels = (people: AccessLevel, giving: AccessLevel, events: AccessLevel, kids: AccessLevel, prayer: AccessLevel, media: AccessLevel, website: AccessLevel, communication: AccessLevel): AreaLevels => ({
  people,
  giving,
  events,
  kids,
  prayer,
  media,
  website,
  communication,
});

export const SUPER_ADMIN_KEY = 'super_admin';
export const DEVELOPER_KEY = 'developer';

/** Rank 1 is the top. People can only manage roles ranked below their own. */
export const ROLE_PRESETS: readonly RolePreset[] = [
  { key: SUPER_ADMIN_KEY, name: 'Super Admin', rank: 1, canManageSetup: true, locked: true, areas: levels(3, 3, 3, 3, 3, 3, 3, 3) },
  { key: DEVELOPER_KEY, name: 'Developer', rank: 2, canManageSetup: true, areas: levels(0, 0, 1, 0, 1, 1, 2, 1) },
  { key: 'admin', name: 'Admin', rank: 3, canManageSetup: false, areas: levels(2, 1, 2, 2, 2, 2, 2, 2) },
  { key: 'pastor', name: 'Pastor', rank: 3, canManageSetup: false, areas: levels(3, 3, 3, 2, 3, 3, 2, 3) },
  { key: 'finance', name: 'Finance', rank: 4, canManageSetup: false, areas: levels(1, 3, 1, 0, 0, 0, 0, 0) },
  { key: 'secretary', name: 'Secretary', rank: 4, canManageSetup: false, areas: levels(2, 1, 2, 1, 1, 1, 2, 2) },
  { key: 'moderator', name: 'Moderator', rank: 5, canManageSetup: false, areas: levels(1, 0, 1, 0, 2, 0, 0, 2) },
  { key: 'media_team', name: 'Media team', rank: 5, canManageSetup: false, areas: levels(0, 0, 0, 0, 0, 2, 1, 1) },
  { key: 'ministry_leader', name: 'Ministry Leader', rank: 6, canManageSetup: false, areas: levels(1, 0, 2, 2, 1, 0, 0, 1) },
  { key: 'volunteer', name: 'Volunteer', rank: 7, canManageSetup: false, areas: levels(0, 0, 1, 1, 0, 0, 0, 0) },
];

/** Which preset an existing Sanctum role starts on. */
export function presetKeyForOrgRole(role: OrganizationRole): string {
  switch (role) {
    case 'OWNER':
      return SUPER_ADMIN_KEY;
    case 'TECHNICAL_ADMIN':
      return DEVELOPER_KEY;
    case 'ADMIN':
      return 'admin';
    case 'PRAYER_LEADER':
      return 'moderator';
    case 'MEDIA':
      return 'media_team';
    default: {
      const unexpected: never = role;
      void unexpected;
      return 'volunteer';
    }
  }
}

/**
 * Live prayer rooms still check the original five roles.
 * A church role maps onto the closest one through its Prayer level.
 */
export function baseOrgRoleFor(role: { key: string; areas: AreaLevels }): OrganizationRole {
  if (role.key === SUPER_ADMIN_KEY) return 'OWNER';
  if (role.areas.prayer >= 3) return 'ADMIN';
  if (role.areas.prayer === 2) return 'PRAYER_LEADER';
  if (role.areas.media >= 2) return 'MEDIA';
  return 'MEDIA';
}

export interface ChurchAccess {
  roleId: string;
  roleKey: string;
  roleName: string;
  rank: number;
  canManageSetup: boolean;
  isSuperAdmin: boolean;
  areas: AreaLevels;
}

export function hasAreaLevel(access: Pick<ChurchAccess, 'areas'> | null | undefined, area: AccessArea, level: AccessLevel): boolean {
  if (!access) return false;
  return access.areas[area] >= level;
}

// ---------------------------------------------------------------- guardrails

export interface RoleRef {
  id: string;
  key: string;
  rank: number;
  locked?: boolean;
}

/** Edit or delete a role: only roles ranked below your own, never a locked one. */
export function canEditRole(actor: Pick<ChurchAccess, 'rank' | 'canManageSetup' | 'roleId'>, role: RoleRef): boolean {
  if (!actor.canManageSetup) return false;
  if (role.locked || role.key === SUPER_ADMIN_KEY) return false;
  if (role.id === actor.roleId) return false;
  return role.rank > actor.rank;
}

/** Give a role to someone. Super Admins may give any role; everyone else only roles below their own. */
export function canAssignRole(
  actor: Pick<ChurchAccess, 'rank' | 'canManageSetup' | 'isSuperAdmin'>,
  actorUserId: string,
  target: { userId: string; currentRank: number | null },
  role: RoleRef
): { ok: true } | { ok: false; reason: string } {
  if (!actor.canManageSetup) return { ok: false, reason: 'Only people who manage church setup can change roles.' };
  if (target.userId === actorUserId) return { ok: false, reason: 'You can’t change your own role. Ask a Super Admin.' };
  if (actor.isSuperAdmin) return { ok: true };
  if (role.rank <= actor.rank) return { ok: false, reason: 'You can only give roles ranked below your own.' };
  if (target.currentRank !== null && target.currentRank <= actor.rank) {
    return { ok: false, reason: 'This person’s role is at or above yours. Ask a Super Admin.' };
  }
  return { ok: true };
}

/** The church must always keep at least one Super Admin. */
export function wouldRemoveLastSuperAdmin(superAdminCount: number, targetIsSuperAdmin: boolean, newRoleIsSuperAdmin: boolean): boolean {
  return targetIsSuperAdmin && !newRoleIsSuperAdmin && superAdminCount <= 1;
}

// ---------------------------------------------------------------- brand

export interface BrandTheme {
  key: string;
  name: string;
  primary: string;
  primaryDark: string;
  accent: string;
  accentSoft: string;
  /** Background and card colors for dusk (dark) mode. */
  duskBg: string;
  duskCard: string;
}

/** Each theme passes 4.5:1 for white text on primary and dark text on accent. */
export const BRAND_THEMES: readonly BrandTheme[] = [
  { key: 'forest', name: 'Forest & gold', primary: '#203C32', primaryDark: '#294D40', accent: '#C9A35A', accentSoft: '#E8D8B2', duskBg: '#10241C', duskCard: '#1A3328' },
  { key: 'burgundy', name: 'Burgundy & gold', primary: '#5E1A2B', primaryDark: '#7A2A3D', accent: '#D4AF37', accentSoft: '#F1E3B5', duskBg: '#1F0F14', duskCard: '#2E1820' },
  { key: 'navy', name: 'Navy & sky', primary: '#1B2A4A', primaryDark: '#2C4170', accent: '#8EC5FF', accentSoft: '#D6E9FF', duskBg: '#0E1626', duskCard: '#18223A' },
  { key: 'purple', name: 'Royal purple', primary: '#3B2366', primaryDark: '#52348A', accent: '#E3B341', accentSoft: '#F4E2B0', duskBg: '#170F26', duskCard: '#241A38' },
  { key: 'charcoal', name: 'Charcoal & coral', primary: '#2B2D31', primaryDark: '#44474D', accent: '#F28C6B', accentSoft: '#FBD9CC', duskBg: '#141518', duskCard: '#202226' },
];

export function brandTheme(key: unknown): BrandTheme {
  return BRAND_THEMES.find((theme) => theme.key === key) || BRAND_THEMES[0];
}

export const TERM_KEYS = ['tithe', 'pastorSpouse', 'smallGroups', 'members'] as const;
export type TermKey = (typeof TERM_KEYS)[number];

export const TERM_LABELS: Record<TermKey, { label: string; fallback: string }> = {
  tithe: { label: 'The main giving fund is called', fallback: 'Tithe' },
  pastorSpouse: { label: "The pastor's spouse's title", fallback: 'First Lady' },
  smallGroups: { label: 'Small groups are called', fallback: 'Groups' },
  members: { label: 'Church members are called', fallback: 'Members' },
};

export function normalizeTerminology(raw: unknown): Record<TermKey, string> {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = {} as Record<TermKey, string>;
  for (const key of TERM_KEYS) {
    const value = source[key];
    out[key] = typeof value === 'string' && value.trim() ? value.trim().slice(0, 40) : TERM_LABELS[key].fallback;
  }
  return out;
}

// ---------------------------------------------------------------- member area

export type MemberPageKey = 'profile' | 'household' | 'groups' | 'livePrayer' | 'events' | 'prayer';

export interface MemberPageDefinition {
  key: MemberPageKey;
  label: string;
  description: string;
  /** Church features this page needs to be on. */
  needs: FeatureKey[];
}

export const MEMBER_PAGES: readonly MemberPageDefinition[] = [
  { key: 'profile', label: 'My profile', description: 'Name, phone, email and birthday', needs: ['members'] },
  { key: 'household', label: 'My household', description: 'The other people in their family', needs: ['members'] },
  { key: 'groups', label: 'My groups & huddles', description: 'Their groups, meeting times and live huddles', needs: ['members'] },
  { key: 'livePrayer', label: 'Live prayer', description: 'Join the church’s prayer rooms as themselves', needs: ['prayerRooms'] },
  { key: 'events', label: 'Events', description: 'RSVP as themselves and see what they signed up for', needs: ['events'] },
  { key: 'prayer', label: 'Prayer requests', description: 'Send a request and see the ones they sent', needs: ['visitors'] },
];

export interface MemberAreaSettings {
  /** Lets members sign in at all. */
  enabled: boolean;
  pages: Record<MemberPageKey, boolean>;
  /** Members may change their own phone, email and birthday. */
  canEditProfile: boolean;
}

export function normalizeMemberArea(raw: unknown): MemberAreaSettings {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const pagesRaw = source.pages && typeof source.pages === 'object' ? (source.pages as Record<string, unknown>) : {};
  const pages = {} as Record<MemberPageKey, boolean>;
  for (const page of MEMBER_PAGES) pages[page.key] = typeof pagesRaw[page.key] === 'boolean' ? (pagesRaw[page.key] as boolean) : true;
  return {
    enabled: typeof source.enabled === 'boolean' ? source.enabled : true,
    pages,
    canEditProfile: typeof source.canEditProfile === 'boolean' ? source.canEditProfile : true,
  };
}

/** What a member actually sees: the area is on, the page is on, and the church features it needs are on. */
export function visibleMemberPages(settings: MemberAreaSettings, features: Record<FeatureKey, boolean>): Record<MemberPageKey, boolean> {
  const out = {} as Record<MemberPageKey, boolean>;
  for (const page of MEMBER_PAGES) {
    out[page.key] = settings.enabled && settings.pages[page.key] && page.needs.every((need) => features[need]);
  }
  return out;
}
