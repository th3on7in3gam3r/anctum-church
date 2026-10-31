/**
 * Church setup storage: roles, feature switches, brand, and the setup activity log.
 */
import type { Prisma } from '@prisma/client';
import {
  ROLE_PRESETS,
  SUPER_ADMIN_KEY,
  baseOrgRoleFor,
  normalizeAreaLevels,
  presetKeyForOrgRole,
  type AreaLevels,
  type ChurchAccess,
} from '../../shared/churchSetup.ts';
import type { OrganizationRole } from '../../shared/roles.ts';
import { DatabaseUnavailable } from '../../shared/errors.ts';
import { getPrisma } from '../prisma.ts';

function prisma() {
  const client = getPrisma();
  if (!client) throw DatabaseUnavailable();
  return client;
}

export interface ChurchRoleRecord {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  rank: number;
  canManageSetup: boolean;
  locked: boolean;
  areas: AreaLevels;
  memberCount: number;
}

type RoleRow = {
  id: string;
  organizationId: string;
  key: string;
  name: string;
  rank: number;
  canManageSetup: boolean;
  locked: boolean;
  areas: unknown;
  _count?: { memberships: number };
};

function toRecord(row: RoleRow): ChurchRoleRecord {
  return {
    id: row.id,
    organizationId: row.organizationId,
    key: row.key,
    name: row.name,
    rank: row.rank,
    canManageSetup: row.canManageSetup,
    locked: row.locked,
    areas: normalizeAreaLevels(row.areas),
    memberCount: row._count?.memberships ?? 0,
  };
}

const ensured = new Set<string>();

/**
 * Every church starts with the preset roles, and every staff member gets the preset
 * that matches their original Sanctum role. Safe to call repeatedly.
 */
export async function ensureChurchRoles(organizationId: string): Promise<void> {
  if (ensured.has(organizationId)) return;
  const db = prisma();
  const existing = await db.churchRole.findMany({ where: { organizationId }, select: { key: true } });
  const have = new Set(existing.map((row: { key: string }) => row.key));
  for (const preset of ROLE_PRESETS) {
    if (have.has(preset.key)) continue;
    await db.churchRole.create({
      data: {
        organizationId,
        key: preset.key,
        name: preset.name,
        rank: preset.rank,
        canManageSetup: preset.canManageSetup,
        locked: Boolean(preset.locked),
        areas: preset.areas as unknown as Prisma.InputJsonValue,
      },
    });
  }
  const unassigned = await db.organizationMembership.findMany({
    where: { organizationId, churchRoleId: null },
    select: { id: true, role: true },
  });
  if (unassigned.length) {
    const roles = await db.churchRole.findMany({ where: { organizationId }, select: { id: true, key: true } });
    const byKey = new Map(roles.map((role: { id: string; key: string }) => [role.key, role.id]));
    for (const membership of unassigned as { id: string; role: OrganizationRole }[]) {
      const roleId = byKey.get(presetKeyForOrgRole(membership.role));
      if (roleId) {
        await db.organizationMembership.update({ where: { id: membership.id }, data: { churchRoleId: roleId } });
      }
    }
  }
  ensured.add(organizationId);
}

export function forgetEnsuredRoles(organizationId?: string) {
  if (organizationId) ensured.delete(organizationId);
  else ensured.clear();
}

export async function accessFor(organizationId: string, userId: string): Promise<ChurchAccess | null> {
  await ensureChurchRoles(organizationId);
  const membership = await prisma().organizationMembership.findUnique({
    where: { organizationId_userId: { organizationId, userId } },
    include: { churchRole: true },
  });
  const role = membership?.churchRole as RoleRow | null | undefined;
  if (!membership || membership.status !== 'ACTIVE' || !role) return null;
  return {
    roleId: role.id,
    roleKey: role.key,
    roleName: role.name,
    rank: role.rank,
    canManageSetup: role.canManageSetup,
    isSuperAdmin: role.key === SUPER_ADMIN_KEY,
    areas: normalizeAreaLevels(role.areas),
  };
}

export async function listRoles(organizationId: string): Promise<ChurchRoleRecord[]> {
  await ensureChurchRoles(organizationId);
  const rows = await prisma().churchRole.findMany({
    where: { organizationId },
    include: { _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } },
    orderBy: [{ rank: 'asc' }, { name: 'asc' }],
  });
  return (rows as RoleRow[]).map(toRecord);
}

export async function roleInOrg(organizationId: string, roleId: string): Promise<ChurchRoleRecord | null> {
  const row = await prisma().churchRole.findFirst({
    where: { id: roleId, organizationId },
    include: { _count: { select: { memberships: { where: { status: 'ACTIVE' } } } } },
  });
  return row ? toRecord(row as RoleRow) : null;
}

export async function createRole(
  organizationId: string,
  input: { key: string; name: string; rank: number; canManageSetup: boolean; areas: AreaLevels }
): Promise<ChurchRoleRecord> {
  const row = await prisma().churchRole.create({
    data: { organizationId, ...input, areas: input.areas as unknown as Prisma.InputJsonValue },
  });
  return toRecord(row as RoleRow);
}

/** Saves the role and moves its people onto the matching live-prayer role. */
export async function updateRole(
  organizationId: string,
  roleId: string,
  input: { name?: string; canManageSetup?: boolean; areas?: AreaLevels }
): Promise<ChurchRoleRecord> {
  const db = prisma();
  const row = await db.churchRole.update({
    where: { id: roleId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.canManageSetup !== undefined ? { canManageSetup: input.canManageSetup } : {}),
      ...(input.areas ? { areas: input.areas as unknown as Prisma.InputJsonValue } : {}),
    },
  });
  const record = toRecord(row as RoleRow);
  await db.organizationMembership.updateMany({
    where: { organizationId, churchRoleId: roleId },
    data: { role: baseOrgRoleFor(record) },
  });
  return record;
}

export async function deleteRole(roleId: string): Promise<void> {
  await prisma().churchRole.delete({ where: { id: roleId } });
}

export interface StaffRecord {
  userId: string;
  name: string;
  email: string;
  roleId: string | null;
  roleName: string | null;
  rank: number | null;
  isSuperAdmin: boolean;
}

export async function listStaff(organizationId: string): Promise<StaffRecord[]> {
  await ensureChurchRoles(organizationId);
  const rows = await prisma().organizationMembership.findMany({
    where: { organizationId, status: 'ACTIVE' },
    include: { user: { select: { id: true, name: true, email: true } }, churchRole: true },
    orderBy: { createdAt: 'asc' },
  });
  return (rows as { user: { id: string; name: string; email: string }; churchRole: RoleRow | null }[]).map((row) => ({
    userId: row.user.id,
    name: row.user.name,
    email: row.user.email,
    roleId: row.churchRole?.id ?? null,
    roleName: row.churchRole?.name ?? null,
    rank: row.churchRole?.rank ?? null,
    isSuperAdmin: row.churchRole?.key === SUPER_ADMIN_KEY,
  }));
}

export async function countSuperAdmins(organizationId: string): Promise<number> {
  return prisma().organizationMembership.count({
    where: { organizationId, status: 'ACTIVE', churchRole: { key: SUPER_ADMIN_KEY } },
  });
}

export async function assignRole(organizationId: string, userId: string, role: ChurchRoleRecord): Promise<void> {
  await prisma().organizationMembership.update({
    where: { organizationId_userId: { organizationId, userId } },
    data: { churchRoleId: role.id, role: baseOrgRoleFor(role) },
  });
}

export interface OrgSetupRow {
  id: string;
  name: string;
  appName: string | null;
  brandTheme: string;
  logoUrl: string | null;
  features: unknown;
  terminology: unknown;
  memberArea: unknown;
}

export async function orgSetup(organizationId: string): Promise<OrgSetupRow | null> {
  return prisma().organization.findUnique({
    where: { id: organizationId },
    select: { id: true, name: true, appName: true, brandTheme: true, logoUrl: true, features: true, terminology: true, memberArea: true },
  }) as Promise<OrgSetupRow | null>;
}

export async function saveFeatures(organizationId: string, features: Record<string, boolean>): Promise<void> {
  await prisma().organization.update({ where: { id: organizationId }, data: { features: features as Prisma.InputJsonValue } });
}

export async function saveMemberArea(organizationId: string, memberArea: unknown): Promise<void> {
  await prisma().organization.update({ where: { id: organizationId }, data: { memberArea: memberArea as Prisma.InputJsonValue } });
}

export async function saveBrand(
  organizationId: string,
  input: { name?: string; appName?: string | null; brandTheme?: string; logoUrl?: string | null; terminology?: Record<string, string> }
): Promise<void> {
  await prisma().organization.update({
    where: { id: organizationId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.appName !== undefined ? { appName: input.appName } : {}),
      ...(input.brandTheme !== undefined ? { brandTheme: input.brandTheme } : {}),
      ...(input.logoUrl !== undefined ? { logoUrl: input.logoUrl } : {}),
      ...(input.terminology !== undefined ? { terminology: input.terminology as Prisma.InputJsonValue } : {}),
    },
  });
}

export async function recordSetupEvent(
  organizationId: string,
  actorId: string,
  action:
    | 'SETUP_FEATURES_CHANGED'
    | 'SETUP_BRAND_CHANGED'
    | 'SETUP_ROLE_CREATED'
    | 'SETUP_ROLE_UPDATED'
    | 'SETUP_ROLE_DELETED'
    | 'SETUP_ROLE_ASSIGNED'
    | 'SETUP_MEMBER_AREA_CHANGED',
  summary: string,
  targetId?: string
): Promise<void> {
  await prisma().auditEvent.create({
    data: { organizationId, actorId, action, targetId: targetId ?? null, metadata: { summary } },
  });
}

export async function listSetupEvents(organizationId: string, limit = 50) {
  const rows = await prisma().auditEvent.findMany({
    where: {
      organizationId,
      action: {
        in: [
          'SETUP_FEATURES_CHANGED',
          'SETUP_BRAND_CHANGED',
          'SETUP_ROLE_CREATED',
          'SETUP_ROLE_UPDATED',
          'SETUP_ROLE_DELETED',
          'SETUP_ROLE_ASSIGNED',
          'SETUP_MEMBER_AREA_CHANGED',
        ],
      },
    },
    include: { actor: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
  return (rows as { id: string; action: string; createdAt: Date; metadata: unknown; actor: { name: string } | null }[]).map((row) => ({
    id: row.id,
    action: row.action,
    at: row.createdAt.toISOString(),
    actorName: row.actor?.name || 'Someone',
    summary:
      row.metadata && typeof row.metadata === 'object' && typeof (row.metadata as { summary?: unknown }).summary === 'string'
        ? (row.metadata as { summary: string }).summary
        : row.action,
  }));
}
