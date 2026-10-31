import { CmsNotFound, Unauthorized } from '../../shared/errors.ts';
import type { ActorContext } from '../authz.ts';

export function requireOrganization(actor: ActorContext): asserts actor is ActorContext & { organizationId: string; userId: string } {
  if (!actor.userId || !actor.organizationId || !actor.orgRole) {
    throw Unauthorized('Sign in with a church staff account.');
  }
}

/**
 * When the church has roles, the area guard in front of /api/cms has already checked the
 * person's level for this request, so these legacy checks step aside.
 */
export function requireCmsAdmin(actor: ActorContext): void {
  requireOrganization(actor);
  if (actor.access) return;
  if (actor.orgRole !== 'OWNER' && actor.orgRole !== 'ADMIN') {
    throw Unauthorized('Church records are managed by the Owner or an Admin.');
  }
}

export function requireMemberReader(actor: ActorContext): void {
  requireOrganization(actor);
  if (actor.access) return;
  if (actor.orgRole !== 'OWNER' && actor.orgRole !== 'ADMIN' && actor.orgRole !== 'PRAYER_LEADER') {
    throw Unauthorized('You cannot view the church directory.');
  }
}

export function assertInOrganization<T extends { organizationId: string }>(
  record: T | null | undefined,
  organizationId: string
): T {
  if (!record || record.organizationId !== organizationId) throw CmsNotFound();
  return record;
}

export function assertCanEditGroup(
  actor: ActorContext,
  group: { organizationId: string; leader: { userId: string | null } | null } | null
): void {
  requireOrganization(actor);
  const scoped = assertInOrganization(group, actor.organizationId);
  if (actor.access) {
    if (actor.access.areas.people >= 2) return;
    if (scoped.leader?.userId === actor.userId) return;
    throw Unauthorized('You can only manage groups you lead.');
  }
  if (actor.orgRole === 'OWNER' || actor.orgRole === 'ADMIN') return;
  if (actor.orgRole === 'PRAYER_LEADER' && scoped.leader?.userId === actor.userId) return;
  throw Unauthorized('You can only manage groups you lead.');
}
