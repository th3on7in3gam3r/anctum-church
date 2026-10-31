import type { Role, RoleCapability } from '../types';
import {
  canCreatePrayerRoom,
  canDeletePrayerRoom,
  canInviteSpeaker,
  canManageParticipants,
  canManageTeam,
  canMuteCongregation,
  canPublishAudio as canPublishSessionAudio,
  canStartPrayerSession,
  canViewPrivatePrayerRequests,
  type SessionRole,
} from '../../shared/roles.ts';

export {
  canCreatePrayerRoom,
  canDeletePrayerRoom,
  canInviteSpeaker,
  canManageParticipants,
  canManageTeam,
  canMuteCongregation,
  canStartPrayerSession,
  canViewPrivatePrayerRequests,
  canPublishSessionAudio,
};

export const ROLE_CAPABILITIES: Record<Role, RoleCapability> = {
  OWNER: {
    role: 'OWNER',
    label: 'Senior Pastor / Owner',
    description: 'Full organization control, billing, church configuration, team management, and prayer rooms.',
    canSpeakAutomatically: false,
    canInviteSpeakers: true,
    canMuteSpeakers: true,
    canManageRooms: true,
    canEndSessions: true,
    canViewPrivateRequests: true,
    canManageSettings: true,
  },
  ADMIN: {
    role: 'ADMIN',
    label: 'Church Administrator',
    description: 'Help run prayer rooms: invite to speak, mute, unmute, and remove listeners. Cannot invite more Admins.',
    canSpeakAutomatically: false,
    canInviteSpeakers: true,
    canMuteSpeakers: true,
    canManageRooms: true,
    canEndSessions: true,
    canViewPrivateRequests: true,
    canManageSettings: false,
  },
  PRAYER_LEADER: {
    role: 'PRAYER_LEADER',
    label: 'Prayer Leader / Pastor',
    description: 'Can start sessions, invite attendees to pray, mute speakers, and manage raised hands.',
    canSpeakAutomatically: false,
    canInviteSpeakers: true,
    canMuteSpeakers: true,
    canManageRooms: false,
    canEndSessions: true,
    canViewPrivateRequests: true,
    canManageSettings: false,
  },
  TECHNICAL_ADMIN: {
    role: 'TECHNICAL_ADMIN',
    label: 'Technical Administrator',
    description: 'Operational session and participant controls without access to private prayer requests.',
    canSpeakAutomatically: false,
    canInviteSpeakers: true,
    canMuteSpeakers: true,
    canManageRooms: false,
    canEndSessions: false,
    canViewPrivateRequests: false,
    canManageSettings: false,
  },
  MEDIA: {
    role: 'MEDIA',
    label: 'Media',
    description: 'Uploads gallery photos and videos. Cannot run prayer rooms or open church records.',
    canSpeakAutomatically: false,
    canInviteSpeakers: false,
    canMuteSpeakers: false,
    canManageRooms: false,
    canEndSessions: false,
    canViewPrivateRequests: false,
    canManageSettings: false,
  },
  SPEAKER: {
    role: 'SPEAKER',
    label: 'Invited Speaker',
    description: 'Session-only role. Authorized to publish microphone audio only while holding the speaker floor.',
    canSpeakAutomatically: false,
    canInviteSpeakers: false,
    canMuteSpeakers: false,
    canManageRooms: false,
    canEndSessions: false,
    canViewPrivateRequests: false,
    canManageSettings: false,
  },
  LISTENER: {
    role: 'LISTENER',
    label: 'Congregation Listener',
    description: 'Listen to live prayer, send reactions (Amen/Praise God), raise hand to pray, and submit prayer requests.',
    canSpeakAutomatically: false,
    canInviteSpeakers: false,
    canMuteSpeakers: false,
    canManageRooms: false,
    canEndSessions: false,
    canViewPrivateRequests: false,
    canManageSettings: false,
  },
};

type CapabilityAction = keyof Omit<RoleCapability, 'role' | 'label' | 'description'>;

function permissionForKnownRole(role: Role, action: CapabilityAction): boolean {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
    case 'SPEAKER':
    case 'LISTENER':
      return Boolean(ROLE_CAPABILITIES[role][action]);
    default: {
      const unexpected: never = role;
      void unexpected;
      return false;
    }
  }
}

export function hasPermission(role: string | null | undefined, action: CapabilityAction): boolean {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
    case 'SPEAKER':
    case 'LISTENER':
      return permissionForKnownRole(role, action);
    default:
      return false;
  }
}

function knownRoleCanModerate(role: Role): boolean {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
      return true;
    case 'MEDIA':
    case 'SPEAKER':
    case 'LISTENER':
      return false;
    default: {
      const unexpected: never = role;
      void unexpected;
      return false;
    }
  }
}

export function canModerate(role: string | null | undefined): boolean {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
    case 'SPEAKER':
    case 'LISTENER':
      return knownRoleCanModerate(role);
    default:
      return false;
  }
}

export function isClientMinister(role: string | null | undefined): boolean {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'HOST':
    case 'MODERATOR':
      return true;
    case 'MEDIA':
    case 'SPEAKER':
    case 'LISTENER':
    case null:
    case undefined:
      return false;
    default:
      return false;
  }
}

export function canPublishAudio(role: string | null | undefined, holdsSpeakerFloor = false): boolean {
  if (role !== 'SPEAKER') return false;
  return canPublishSessionAudio(role, holdsSpeakerFloor);
}
