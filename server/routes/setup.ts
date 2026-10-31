/**
 * Church setup: features, brand and roles. Only people whose role has
 * "Manage church setup" reach any of this, and every change is logged.
 */
import type { Express, Request, Response } from 'express';
import { z } from 'zod';
import { Unauthorized, ValidationError } from '../../shared/errors.ts';
import {
  AREAS,
  ACCESS_LEVEL_LABELS,
  BRAND_THEMES,
  FEATURES,
  TERM_KEYS,
  applyFeatureChange,
  canAssignRole,
  canEditRole,
  effectiveFeatures,
  featureDefinition,
  isFeatureKey,
  normalizeAreaLevels,
  normalizeTerminology,
  storedFeatureSwitches,
  wouldRemoveLastSuperAdmin,
  MEMBER_PAGES,
  normalizeMemberArea,
  visibleMemberPages,
  type ChurchAccess,
} from '../../shared/churchSetup.ts';
import { resolveActorFromRequest } from '../clerkAuth.ts';
import { sendError } from '../http.ts';
import * as setup from '../repositories/setup.ts';

interface SetupActor {
  userId: string;
  organizationId: string;
  access: ChurchAccess;
  name: string;
}

async function setupActor(req: Request): Promise<SetupActor> {
  const actor = await resolveActorFromRequest(req);
  if (!actor.userId || !actor.organizationId || !actor.orgRole) {
    throw Unauthorized('Sign in with a church staff account.');
  }
  if (!actor.access?.canManageSetup) {
    throw Unauthorized('Church setup is managed by a Super Admin or the church Developer.');
  }
  return { userId: actor.userId, organizationId: actor.organizationId, access: actor.access, name: actor.access.roleName };
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body ?? {});
  if (!result.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of result.error.issues) fieldErrors[issue.path.join('.') || 'form'] = issue.message;
    throw new ValidationError(fieldErrors);
  }
  return result.data;
}

const levelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);
const areasSchema = z.record(z.string(), levelSchema);

async function snapshot(actor: SetupActor) {
  const [org, roles, staff, activity] = await Promise.all([
    setup.orgSetup(actor.organizationId),
    setup.listRoles(actor.organizationId),
    setup.listStaff(actor.organizationId),
    setup.listSetupEvents(actor.organizationId, 30),
  ]);
  return {
    features: { switches: storedFeatureSwitches(org?.features), effective: effectiveFeatures(org?.features), definitions: FEATURES },
    brand: {
      name: org?.name || '',
      appName: org?.appName || '',
      brandTheme: org?.brandTheme || 'forest',
      logoUrl: org?.logoUrl || '',
      terminology: normalizeTerminology(org?.terminology),
      themes: BRAND_THEMES,
    },
    memberArea: {
      settings: normalizeMemberArea(org?.memberArea),
      visible: visibleMemberPages(normalizeMemberArea(org?.memberArea), effectiveFeatures(org?.features)),
      pages: MEMBER_PAGES,
    },
    areas: AREAS,
    roles: roles.map((role) => ({ ...role, editable: canEditRole(actor.access, role) })),
    staff: staff.map((person) => ({
      ...person,
      isYou: person.userId === actor.userId,
    })),
    activity,
    you: { userId: actor.userId, ...actor.access },
  };
}

async function getSetup(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

async function changeFeature(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const input = parse(z.object({ key: z.string(), on: z.boolean() }), req.body);
    if (!isFeatureKey(input.key)) throw new ValidationError({ key: 'Unknown feature.' });
    const feature = featureDefinition(input.key);
    if (feature.status !== 'ready' && input.on) {
      throw new ValidationError({ key: `${feature.label} is coming soon and can't be turned on yet.` });
    }
    const org = await setup.orgSetup(actor.organizationId);
    const current = storedFeatureSwitches(org?.features);
    const result = applyFeatureChange(current, input.key, input.on);
    if (result.missing.length) {
      const names = result.missing.map((key) => featureDefinition(key).label).join(' and ');
      throw new ValidationError({ key: `Turn on ${names} first.` });
    }
    await setup.saveFeatures(actor.organizationId, result.next);
    const extra = result.alsoTurnedOff.length
      ? ` (also turned off ${result.alsoTurnedOff.map((key) => featureDefinition(key).label).join(', ')})`
      : '';
    await setup.recordSetupEvent(
      actor.organizationId,
      actor.userId,
      'SETUP_FEATURES_CHANGED',
      `Turned ${input.on ? 'on' : 'off'} ${feature.label}${extra}`
    );
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

async function saveMemberAreaHandler(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const input = parse(
      z.object({
        enabled: z.boolean().optional(),
        canEditProfile: z.boolean().optional(),
        page: z.string().optional(),
        on: z.boolean().optional(),
      }),
      req.body
    );
    const org = await setup.orgSetup(actor.organizationId);
    const current = normalizeMemberArea(org?.memberArea);
    let summary = '';
    if (input.enabled !== undefined) {
      current.enabled = input.enabled;
      summary = input.enabled ? 'Turned on member sign-in' : 'Turned off member sign-in';
    } else if (input.canEditProfile !== undefined) {
      current.canEditProfile = input.canEditProfile;
      summary = input.canEditProfile ? 'Members can now edit their own details' : 'Members can no longer edit their own details';
    } else if (input.page && input.on !== undefined) {
      const page = MEMBER_PAGES.find((item) => item.key === input.page);
      if (!page) throw new ValidationError({ page: 'Unknown member page.' });
      current.pages[page.key] = input.on;
      summary = `${input.on ? 'Showed' : 'Hid'} ${page.label} in the member area`;
    } else {
      throw new ValidationError({ form: 'Nothing to change.' });
    }
    await setup.saveMemberArea(actor.organizationId, current);
    await setup.recordSetupEvent(actor.organizationId, actor.userId, 'SETUP_MEMBER_AREA_CHANGED', summary);
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

const brandSchema = z.object({
  name: z.string().trim().min(2, 'Enter the church name.').max(120).optional(),
  appName: z.string().trim().max(40).optional(),
  brandTheme: z.string().optional(),
  logoUrl: z.string().trim().url('Enter a full web address for the logo.').max(500).or(z.literal('')).optional(),
  terminology: z.record(z.string(), z.string().max(40)).optional(),
});

async function saveBrand(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const input = parse(brandSchema, req.body);
    if (input.brandTheme && !BRAND_THEMES.some((theme) => theme.key === input.brandTheme)) {
      throw new ValidationError({ brandTheme: 'Pick one of the color themes.' });
    }
    const terminology = input.terminology
      ? normalizeTerminology(Object.fromEntries(Object.entries(input.terminology).filter(([key]) => (TERM_KEYS as readonly string[]).includes(key))))
      : undefined;
    await setup.saveBrand(actor.organizationId, {
      name: input.name,
      appName: input.appName === undefined ? undefined : input.appName || null,
      brandTheme: input.brandTheme,
      logoUrl: input.logoUrl === undefined ? undefined : input.logoUrl || null,
      terminology,
    });
    const changed = [
      input.name !== undefined ? 'church name' : null,
      input.appName !== undefined ? 'app name' : null,
      input.brandTheme ? `colors (${BRAND_THEMES.find((theme) => theme.key === input.brandTheme)?.name})` : null,
      input.logoUrl !== undefined ? 'logo' : null,
      terminology ? 'church words' : null,
    ].filter(Boolean);
    await setup.recordSetupEvent(actor.organizationId, actor.userId, 'SETUP_BRAND_CHANGED', `Updated the ${changed.join(', ') || 'brand'}`);
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

function roleKeyFrom(name: string) {
  return `custom_${name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 30)}_${Date.now().toString(36)}`;
}

async function createRole(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const input = parse(
      z.object({
        name: z.string().trim().min(2, 'Give the role a name.').max(40),
        rank: z.number().int().min(1).max(20).optional(),
        canManageSetup: z.boolean().optional(),
        areas: areasSchema.optional(),
      }),
      req.body
    );
    const rank = Math.max(input.rank ?? actor.access.rank + 1, actor.access.rank + 1);
    const existing = await setup.listRoles(actor.organizationId);
    if (existing.some((role) => role.name.toLowerCase() === input.name.toLowerCase())) {
      throw new ValidationError({ name: 'A role with that name already exists.' });
    }
    const role = await setup.createRole(actor.organizationId, {
      key: roleKeyFrom(input.name),
      name: input.name,
      rank,
      canManageSetup: Boolean(input.canManageSetup),
      areas: normalizeAreaLevels(input.areas),
    });
    await setup.recordSetupEvent(actor.organizationId, actor.userId, 'SETUP_ROLE_CREATED', `Created the ${role.name} role`, role.id);
    res.status(201).json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

async function updateRole(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const role = await setup.roleInOrg(actor.organizationId, req.params.id);
    if (!role) throw Unauthorized('Role not found.');
    if (!canEditRole(actor.access, role)) {
      throw Unauthorized(
        role.locked ? 'The Super Admin role always has full access.' : 'You can only change roles ranked below your own.'
      );
    }
    const input = parse(
      z.object({
        name: z.string().trim().min(2).max(40).optional(),
        canManageSetup: z.boolean().optional(),
        areas: areasSchema.optional(),
      }),
      req.body
    );
    const areas = input.areas ? normalizeAreaLevels({ ...role.areas, ...input.areas }) : undefined;
    const updated = await setup.updateRole(actor.organizationId, role.id, { name: input.name, canManageSetup: input.canManageSetup, areas });
    const parts: string[] = [];
    if (input.name && input.name !== role.name) parts.push(`renamed to ${input.name}`);
    if (input.canManageSetup !== undefined && input.canManageSetup !== role.canManageSetup) {
      parts.push(input.canManageSetup ? 'can now manage church setup' : 'can no longer manage church setup');
    }
    if (areas) {
      for (const area of AREAS) {
        if (areas[area.key] !== role.areas[area.key]) parts.push(`${area.label} → ${ACCESS_LEVEL_LABELS[areas[area.key]]}`);
      }
    }
    await setup.recordSetupEvent(
      actor.organizationId,
      actor.userId,
      'SETUP_ROLE_UPDATED',
      `Changed ${role.name}: ${parts.join(', ') || 'no changes'}`,
      updated.id
    );
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

async function deleteRole(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const role = await setup.roleInOrg(actor.organizationId, req.params.id);
    if (!role) throw Unauthorized('Role not found.');
    if (!canEditRole(actor.access, role)) throw Unauthorized('You can only delete roles ranked below your own.');
    if (role.memberCount > 0) {
      throw new ValidationError({ role: `Move the ${role.memberCount} ${role.memberCount === 1 ? 'person' : 'people'} with this role to another role first.` });
    }
    await setup.deleteRole(role.id);
    await setup.recordSetupEvent(actor.organizationId, actor.userId, 'SETUP_ROLE_DELETED', `Deleted the ${role.name} role`, role.id);
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

async function assignRole(req: Request, res: Response) {
  try {
    const actor = await setupActor(req);
    const input = parse(z.object({ roleId: z.string().min(1) }), req.body);
    const role = await setup.roleInOrg(actor.organizationId, input.roleId);
    if (!role) throw new ValidationError({ roleId: 'Pick a role.' });
    const staff = await setup.listStaff(actor.organizationId);
    const target = staff.find((person) => person.userId === req.params.userId);
    if (!target) throw Unauthorized('That person is not on this church’s staff.');
    const allowed = canAssignRole(actor.access, actor.userId, { userId: target.userId, currentRank: target.rank }, role);
    if ('reason' in allowed) throw Unauthorized(allowed.reason);
    const superCount = await setup.countSuperAdmins(actor.organizationId);
    if (wouldRemoveLastSuperAdmin(superCount, target.isSuperAdmin, role.key === 'super_admin')) {
      throw new ValidationError({ roleId: 'The church must keep at least one Super Admin. Make someone else Super Admin first.' });
    }
    await setup.assignRole(actor.organizationId, target.userId, role);
    await setup.recordSetupEvent(
      actor.organizationId,
      actor.userId,
      'SETUP_ROLE_ASSIGNED',
      `Gave ${target.name} the ${role.name} role${target.roleName ? ` (was ${target.roleName})` : ''}`,
      target.userId
    );
    res.json(await snapshot(actor));
  } catch (error) {
    sendError(res, error);
  }
}

/** For the staff app: what this church has on and what this person may open. Any staff member. */
async function getMyAccess(req: Request, res: Response) {
  try {
    const actor = await resolveActorFromRequest(req);
    if (!actor.userId || !actor.organizationId || !actor.orgRole) throw Unauthorized('Sign in with a church staff account.');
    const org = await setup.orgSetup(actor.organizationId);
    res.json({
      access: actor.access ?? null,
      features: effectiveFeatures(org?.features),
      brand: {
        appName: org?.appName || '',
        brandTheme: org?.brandTheme || 'forest',
        terminology: normalizeTerminology(org?.terminology),
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export function registerSetupRoutes(app: Express): void {
  app.get('/api/me/access', getMyAccess);
  app.get('/api/setup', getSetup);
  app.put('/api/setup/features', changeFeature);
  app.put('/api/setup/brand', saveBrand);
  app.put('/api/setup/member-area', saveMemberAreaHandler);
  app.post('/api/setup/roles', createRole);
  app.patch('/api/setup/roles/:id', updateRole);
  app.delete('/api/setup/roles/:id', deleteRole);
  app.put('/api/setup/staff/:userId/role', assignRole);
  app.get('/api/setup/activity', async (req, res) => {
    try {
      const actor = await setupActor(req);
      res.json({ activity: await setup.listSetupEvents(actor.organizationId, 100) });
    } catch (error) {
      sendError(res, error);
    }
  });
}
