/**
 * Clerk sessions authenticate. OrganizationMembership rows authorize.
 * Prototype `x-user-id` spoofing is no longer accepted.
 */
import { Unauthorized } from '../shared/errors.ts';
import {
  canCreatePrayerRoom,
  canDeletePrayerRoom,
  canMuteCongregation,
  canInviteSpeaker,
  canManageParticipants,
  canStartPrayerSession,
  canManageOrganization,
  canManageTeam,
  deriveSessionRoleFromOrgRole,
  type OrganizationRole,
  type SessionRole,
} from '../shared/roles.ts';
import { membershipRepository } from './repositories/index.ts';
import { accessFor, orgSetup } from './repositories/setup.ts';
import { effectiveFeatures, type ChurchAccess, type FeatureKey } from '../shared/churchSetup.ts';

export interface ActorContext {
  userId: string | null;
  organizationId: string | null;
  orgRole: OrganizationRole | null;
  canPublishGallery?: boolean;
  /** The church role and its area levels. Null when the person has no active role. */
  access?: ChurchAccess | null;
  /** What this church has switched on. */
  features?: Record<FeatureKey, boolean>;
}

export async function resolveActor(organizationId: string | null, userId: string | null): Promise<ActorContext> {
  if (!organizationId || !userId) {
    return { userId, organizationId, orgRole: null };
  }
  const membership = await membershipRepository.find(organizationId, userId);
  if (!membership || membership.status !== 'ACTIVE') {
    return { userId, organizationId, orgRole: null };
  }
  const [access, org] = await Promise.all([accessFor(organizationId, userId), orgSetup(organizationId)]);
  return {
    userId,
    organizationId,
    orgRole: membership.role,
    canPublishGallery: membership.canPublishGallery,
    access,
    features: effectiveFeatures(org?.features),
  };
}

export function requireOrgPermission(
  actor: ActorContext,
  allowed: (role: OrganizationRole) => boolean,
  message?: string
): OrganizationRole {
  if (!actor.orgRole || !allowed(actor.orgRole)) {
    throw Unauthorized(message);
  }
  return actor.orgRole;
}

export function requireCanCreateRoom(actor: ActorContext): OrganizationRole {
  return requireOrgPermission(actor, canCreatePrayerRoom, 'Not authorized to create prayer rooms');
}

export function requireCanDeleteRoom(actor: ActorContext): OrganizationRole {
  return requireOrgPermission(actor, canDeletePrayerRoom, 'Not authorized to delete prayer rooms');
}

export function requireCanMuteCongregation(actor: ActorContext): OrganizationRole {
  return requireOrgPermission(actor, canMuteCongregation, 'Not authorized to mute or unmute the congregation');
}

export function requireCanStartSession(actor: ActorContext): OrganizationRole {
  return requireOrgPermission(actor, canStartPrayerSession, 'Not authorized to start prayer sessions');
}

export function requireCanManageParticipants(actor: ActorContext): OrganizationRole {
  return requireOrgPermission(actor, canManageParticipants, 'Not authorized to manage participants');
}

export function requireCanInviteSpeaker(actor: ActorContext): OrganizationRole {
  return requireOrgPermission(actor, canInviteSpeaker, 'Not authorized to invite speakers');
}

export function requireCanManageTeam(actor: ActorContext): OrganizationRole {
  if (actor.orgRole && actor.access?.canManageSetup) return actor.orgRole;
  return requireOrgPermission(actor, canManageTeam, 'Not authorized to manage church staff');
}

export function requireCanManageOrganization(actor: ActorContext): OrganizationRole {
  if (actor.orgRole && actor.access?.canManageSetup) return actor.orgRole;
  return requireOrgPermission(actor, canManageOrganization, 'Not authorized to update this Sanctum Space');
}

export function requireGalleryEditor(actor: ActorContext): OrganizationRole {
  if (actor.orgRole && actor.access) {
    if (actor.access.areas.media >= 1) return actor.orgRole;
    throw Unauthorized('Gallery is managed by the media team.');
  }
  switch (actor.orgRole) {
    case 'OWNER':
    case 'ADMIN':
    case 'MEDIA':
      return actor.orgRole;
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case null:
      throw Unauthorized('Gallery is managed by the media team.');
    default: {
      const unexpected: never = actor.orgRole;
      void unexpected;
      throw Unauthorized('Gallery is managed by the media team.');
    }
  }
}

export function requireGalleryPublisher(actor: ActorContext): OrganizationRole {
  if (actor.orgRole && actor.access) {
    if (actor.access.areas.media >= 3 || (actor.access.areas.media >= 2 && actor.canPublishGallery)) return actor.orgRole;
    throw Unauthorized('This album is waiting for a publisher.');
  }
  switch (actor.orgRole) {
    case 'OWNER':
    case 'ADMIN':
      return actor.orgRole;
    case 'MEDIA':
      if (actor.canPublishGallery) return actor.orgRole;
      throw Unauthorized('This album is waiting for a publisher.');
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case null:
      throw Unauthorized('This album is waiting for a publisher.');
    default: {
      const unexpected: never = actor.orgRole;
      void unexpected;
      throw Unauthorized('This album is waiting for a publisher.');
    }
  }
}

export function requireConsentConfirmer(actor: ActorContext): OrganizationRole {
  if (actor.orgRole && actor.access) {
    if (actor.access.areas.media >= 3) return actor.orgRole;
    throw Unauthorized('Only someone with Approve access to Sermons & gallery can confirm consent.');
  }
  switch (actor.orgRole) {
    case 'OWNER':
    case 'ADMIN':
      return actor.orgRole;
    case 'MEDIA':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case null:
      throw Unauthorized('Only an Owner or Admin can confirm consent.');
    default: {
      const unexpected: never = actor.orgRole;
      void unexpected;
      throw Unauthorized('Only an Owner or Admin can confirm consent.');
    }
  }
}

export function sessionRoleForJoin(orgRole: OrganizationRole | null, requestedRole: unknown): SessionRole {
  void requestedRole;
  return deriveSessionRoleFromOrgRole(orgRole);
}
