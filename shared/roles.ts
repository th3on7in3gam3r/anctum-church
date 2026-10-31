export type OrganizationRole = 'OWNER' | 'ADMIN' | 'PRAYER_LEADER' | 'TECHNICAL_ADMIN' | 'MEDIA';

export type SessionRole = 'HOST' | 'MODERATOR' | 'SPEAKER' | 'LISTENER';

export type OrgPermission =
  | 'organization.manage'
  | 'room.create'
  | 'room.edit'
  | 'room.delete'
  | 'session.start'
  | 'session.end'
  | 'session.manage'
  | 'participant.remove'
  | 'participant.inviteToSpeak'
  | 'participant.revokeSpeaker'
  | 'participant.mute'
  | 'prayerRequest.viewPrivate'
  | 'prayerRequest.manage'
  | 'team.manage';

export const INVITEABLE_ORG_ROLES = ['ADMIN', 'MEDIA'] as const;

export function isInviteableOrgRole(role: string): role is 'ADMIN' | 'MEDIA' {
  return (INVITEABLE_ORG_ROLES as readonly string[]).includes(role);
}

export const ORGANIZATION_PERMISSIONS: Record<OrganizationRole, readonly OrgPermission[]> = {
  OWNER: [
    'organization.manage',
    'room.create',
    'room.edit',
    'room.delete',
    'session.start',
    'session.end',
    'session.manage',
    'participant.remove',
    'participant.inviteToSpeak',
    'participant.revokeSpeaker',
    'participant.mute',
    'prayerRequest.viewPrivate',
    'prayerRequest.manage',
    'team.manage',
  ],
  ADMIN: [
    'room.create',
    'room.edit',
    'room.delete',
    'session.start',
    'session.end',
    'session.manage',
    'participant.remove',
    'participant.inviteToSpeak',
    'participant.revokeSpeaker',
    'participant.mute',
    'prayerRequest.viewPrivate',
    'prayerRequest.manage',
  ],
  PRAYER_LEADER: [
    'session.start',
    'session.end',
    'session.manage',
    'participant.inviteToSpeak',
    'participant.revokeSpeaker',
    'participant.mute',
    'prayerRequest.viewPrivate',
    'prayerRequest.manage',
  ],
  TECHNICAL_ADMIN: [
    'session.manage',
    'participant.remove',
    'participant.inviteToSpeak',
    'participant.revokeSpeaker',
    'participant.mute',
  ],
  MEDIA: [],
};

function permissionsForKnownRole(role: OrganizationRole): readonly OrgPermission[] {
  switch (role) {
    case 'OWNER':
      return ORGANIZATION_PERMISSIONS.OWNER;
    case 'ADMIN':
      return ORGANIZATION_PERMISSIONS.ADMIN;
    case 'PRAYER_LEADER':
      return ORGANIZATION_PERMISSIONS.PRAYER_LEADER;
    case 'TECHNICAL_ADMIN':
      return ORGANIZATION_PERMISSIONS.TECHNICAL_ADMIN;
    case 'MEDIA':
      return ORGANIZATION_PERMISSIONS.MEDIA;
    default: {
      const unexpected: never = role;
      void unexpected;
      return [];
    }
  }
}

export function permissionsForRole(role: string | null | undefined): readonly OrgPermission[] {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
      return permissionsForKnownRole(role);
    default:
      return [];
  }
}

export function hasOrgPermission(role: string | null | undefined, permission: OrgPermission): boolean {
  return permissionsForRole(role).includes(permission);
}

function staffAreaForKnownRole(role: OrganizationRole, area: 'members' | 'giving' | 'sermons' | 'settings' | 'rooms' | 'sessions') {
  switch (role) {
    case 'MEDIA':
      return false;
    case 'OWNER':
      return true;
    case 'ADMIN':
      return area !== 'settings';
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
      return area === 'rooms' || area === 'sessions';
    default: {
      const unexpected: never = role;
      void unexpected;
      return false;
    }
  }
}

export function staffAreaAllowed(role: string | null | undefined, area: 'members' | 'giving' | 'sermons' | 'settings' | 'rooms' | 'sessions') {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
      return staffAreaForKnownRole(role, area);
    default:
      return false;
  }
}

export function canManageTeam(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'team.manage');
}

export function canManageOrganization(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'organization.manage');
}

export function canCreatePrayerRoom(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'room.create');
}

export function canMuteCongregation(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'room.edit');
}

export function canDeletePrayerRoom(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'room.delete');
}

export function canStartPrayerSession(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'session.start');
}

export function canManageParticipants(role: OrganizationRole): boolean {
  return (
    hasOrgPermission(role, 'participant.remove') ||
    hasOrgPermission(role, 'participant.mute') ||
    hasOrgPermission(role, 'session.manage')
  );
}

export function canInviteSpeaker(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'participant.inviteToSpeak');
}

export function canViewPrivatePrayerRequests(role: OrganizationRole): boolean {
  return hasOrgPermission(role, 'prayerRequest.viewPrivate');
}

export function isSessionModerator(role: SessionRole): boolean {
  return role === 'HOST' || role === 'MODERATOR';
}

export function canPublishAudio(sessionRole: SessionRole, holdsSpeakerFloor: boolean): boolean {
  return sessionRole === 'SPEAKER' && holdsSpeakerFloor;
}

export function isSessionSpeaker(role: SessionRole): boolean {
  return role === 'SPEAKER';
}

function sessionRoleForKnownOrgRole(orgRole: OrganizationRole | null): SessionRole {
  switch (orgRole) {
    case 'OWNER':
    case 'ADMIN':
      return 'HOST';
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
      return 'MODERATOR';
    case 'MEDIA':
    case null:
      return 'LISTENER';
    default: {
      const unexpected: never = orgRole;
      void unexpected;
      return 'LISTENER';
    }
  }
}

export function deriveSessionRoleFromOrgRole(orgRole: string | null | undefined): SessionRole {
  switch (orgRole) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
    case null:
    case undefined:
      return sessionRoleForKnownOrgRole(orgRole ?? null);
    default:
      return 'LISTENER';
  }
}
