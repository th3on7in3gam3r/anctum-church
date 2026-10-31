import { describe, expect, it } from 'vitest';
import {
  BRAND_THEMES,
  ROLE_PRESETS,
  applyFeatureChange,
  baseOrgRoleFor,
  canAssignRole,
  canEditRole,
  effectiveFeatures,
  normalizeAreaLevels,
  normalizeTerminology,
  storedFeatureSwitches,
  wouldRemoveLastSuperAdmin,
} from '../shared/churchSetup.ts';

const developer = { roleId: 'dev', rank: 2, canManageSetup: true, isSuperAdmin: false };
const superAdmin = { roleId: 'super', rank: 1, canManageSetup: true, isSuperAdmin: true };

describe('feature switches', () => {
  it('fills in defaults and ignores unknown keys', () => {
    const stored = storedFeatureSwitches({ members: false, nonsense: true });
    expect(stored.members).toBe(false);
    expect(stored.events).toBe(true);
    expect('nonsense' in stored).toBe(false);
  });

  it('turns a feature off when something it needs is off', () => {
    const on = effectiveFeatures({ prayerRooms: false, prayerRequests: true });
    expect(on.prayerRequests).toBe(false);
  });

  it('never treats an unshipped feature as on', () => {
    expect(effectiveFeatures({ giving: true }).giving).toBe(false);
  });

  it('turning one off also turns off what depends on it', () => {
    const current = storedFeatureSwitches({ greetings: true, kidsCheckin: true });
    const result = applyFeatureChange(current, 'members', false);
    expect(result.next.members).toBe(false);
    expect(result.alsoTurnedOff.sort()).toEqual(['greetings', 'kidsCheckin']);
  });

  it('refuses to turn one on while what it needs is off', () => {
    const current = storedFeatureSwitches({ prayerRooms: false, prayerRequests: false });
    const result = applyFeatureChange(current, 'prayerRequests', true);
    expect(result.missing).toEqual(['prayerRooms']);
    expect(result.next.prayerRequests).toBe(false);
  });
});

describe('role guardrails', () => {
  const admin = { id: 'admin', key: 'admin', rank: 3 };
  const superRole = { id: 'super', key: 'super_admin', rank: 1, locked: true };
  const devRole = { id: 'dev', key: 'developer', rank: 2 };

  it('lets setup managers edit only roles below their own', () => {
    expect(canEditRole(developer, admin)).toBe(true);
    expect(canEditRole(developer, devRole)).toBe(false);
    expect(canEditRole(developer, superRole)).toBe(false);
    expect(canEditRole({ ...developer, canManageSetup: false }, admin)).toBe(false);
  });

  it('nobody edits the Super Admin role', () => {
    expect(canEditRole(superAdmin, superRole)).toBe(false);
  });

  it('blocks changing your own role', () => {
    const result = canAssignRole(superAdmin, 'u1', { userId: 'u1', currentRank: 1 }, admin);
    expect(result.ok).toBe(false);
  });

  it('a Developer cannot hand out Developer or Super Admin', () => {
    expect(canAssignRole(developer, 'u1', { userId: 'u2', currentRank: 3 }, devRole).ok).toBe(false);
    expect(canAssignRole(developer, 'u1', { userId: 'u2', currentRank: 3 }, superRole).ok).toBe(false);
    expect(canAssignRole(developer, 'u1', { userId: 'u2', currentRank: 5 }, admin).ok).toBe(true);
  });

  it('a Developer cannot demote someone at or above them', () => {
    expect(canAssignRole(developer, 'u1', { userId: 'u2', currentRank: 1 }, admin).ok).toBe(false);
  });

  it('keeps the last Super Admin', () => {
    expect(wouldRemoveLastSuperAdmin(1, true, false)).toBe(true);
    expect(wouldRemoveLastSuperAdmin(2, true, false)).toBe(false);
    expect(wouldRemoveLastSuperAdmin(1, false, false)).toBe(false);
  });
});

describe('presets and mapping', () => {
  it('has exactly one locked top role', () => {
    expect(ROLE_PRESETS.filter((role) => role.locked).map((role) => role.key)).toEqual(['super_admin']);
    expect(Math.min(...ROLE_PRESETS.map((role) => role.rank))).toBe(1);
  });

  it('maps church roles onto the live-prayer roles by prayer level', () => {
    expect(baseOrgRoleFor({ key: 'super_admin', areas: normalizeAreaLevels({}) })).toBe('OWNER');
    expect(baseOrgRoleFor({ key: 'x', areas: normalizeAreaLevels({ prayer: 3 }) })).toBe('ADMIN');
    expect(baseOrgRoleFor({ key: 'x', areas: normalizeAreaLevels({ prayer: 2 }) })).toBe('PRAYER_LEADER');
    expect(baseOrgRoleFor({ key: 'x', areas: normalizeAreaLevels({ prayer: 1 }) })).toBe('MEDIA');
  });

  it('cleans terminology', () => {
    const terms = normalizeTerminology({ tithe: '  Seed  ', members: '' });
    expect(terms.tithe).toBe('Seed');
    expect(terms.members).toBe('Members');
  });
});

function luminance(hex: string) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a: string, b: string) {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

describe('brand themes stay readable', () => {
  it.each(BRAND_THEMES.map((theme) => [theme.name, theme]))('%s', (_name, theme) => {
    expect(contrast('#FFFFFF', theme.primary)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#FFFFFF', theme.primaryDark)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#16251F', theme.accent)).toBeGreaterThanOrEqual(4.5);
  });
});

import { levelNeeded, ruleForPath } from '../server/cms/areaGuard.ts';
import { navItemAllowed, navItemForPath } from '../src/lib/staffNav.ts';

describe('staff request rules', () => {
  it('maps every church records path to a feature and area', () => {
    expect(ruleForPath('/api/cms/members/import/preview')).toMatchObject({ feature: 'members', area: 'people' });
    expect(ruleForPath('/api/cms/gallery/albums/a1/photos')).toMatchObject({ feature: 'gallery', area: 'media' });
    expect(ruleForPath('/api/cms/faqs')).toMatchObject({ feature: 'website', area: 'website' });
    expect(ruleForPath('/api/cms/unknown')).toBeNull();
  });

  it('reading needs View and changing needs Edit, except a leader editing their group', () => {
    const members = ruleForPath('/api/cms/members')!;
    expect(levelNeeded('GET', members)).toBe(1);
    expect(levelNeeded('PATCH', members)).toBe(2);
    expect(levelNeeded('PATCH', ruleForPath('/api/cms/groups/g1')!)).toBe(1);
  });
});

describe('staff menu', () => {
  const access = {
    roleId: 'r', roleKey: 'volunteer', roleName: 'Volunteer', rank: 7, canManageSetup: false, isSuperAdmin: false,
    areas: normalizeAreaLevels({ events: 1 }),
  };
  const all = storedFeatureSwitches({});
  it('hides what the role cannot open and what the church turned off', () => {
    expect(navItemAllowed(navItemForPath('/dashboard/church/events')!, access, all)).toBe(true);
    expect(navItemAllowed(navItemForPath('/dashboard/church/members')!, access, all)).toBe(false);
    expect(navItemAllowed(navItemForPath('/dashboard/setup')!, access, all)).toBe(false);
    expect(navItemAllowed(navItemForPath('/dashboard/church/events')!, access, { ...all, events: false })).toBe(false);
  });
});

describe('dusk mode stays readable', () => {
  it.each(BRAND_THEMES.map((theme) => [theme.name, theme]))('%s', (_name, theme) => {
    expect(contrast('#F6F1E6', theme.duskBg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#F6F1E6', theme.duskCard)).toBeGreaterThanOrEqual(4.5);
    expect(contrast('#D5CBB8', theme.duskCard)).toBeGreaterThanOrEqual(4.5);
  });
});

import { normalizeMemberArea, visibleMemberPages } from '../shared/churchSetup.ts';

describe('member area', () => {
  const allOn = effectiveFeatures({});
  it('defaults to on with every page shown', () => {
    const settings = normalizeMemberArea(null);
    expect(settings.enabled).toBe(true);
    expect(Object.values(visibleMemberPages(settings, allOn)).every(Boolean)).toBe(true);
  });
  it('hides every page when member sign-in is off', () => {
    const settings = normalizeMemberArea({ enabled: false });
    expect(Object.values(visibleMemberPages(settings, allOn)).some(Boolean)).toBe(false);
  });
  it('hides a page the church switched off, or whose feature is off', () => {
    const settings = normalizeMemberArea({ pages: { household: false } });
    const visible = visibleMemberPages(settings, { ...allOn, events: false });
    expect(visible.household).toBe(false);
    expect(visible.events).toBe(false);
    expect(visible.groups).toBe(true);
  });
});
