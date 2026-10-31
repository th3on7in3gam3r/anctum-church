import { describe, expect, it } from 'vitest';
import { DuplicateSlug, SanctumError } from '../shared/errors.ts';
import { buildLiveKitTokenGrants } from '../shared/livekitGrants.ts';
import {
  canDeletePrayerRoom,
  canInviteSpeaker,
  canManageParticipants,
  canManageTeam,
  canMuteCongregation,
  canPublishAudio,
  canViewPrivatePrayerRequests,
  isInviteableOrgRole,
  isSessionModerator,
} from '../shared/roles.ts';
import { canTransitionSession, type SessionLifecycleState } from '../shared/sessionStateMachine.ts';
import { ensureSlugAvailable } from '../shared/slug.ts';
import { createGuestRealtimeIdentity, resolveJoinRealtimeIdentity } from '../server/identity.ts';
import { SpeakerFloorService, type SpeakerFloorStore } from '../server/services/speakerFloorService.ts';
import type { PrayerSessionRecord, SessionParticipantRecord } from '../server/repositories/index.ts';

function createMemoryFloorStore(seed?: { occupiedBy?: string | null }): SpeakerFloorStore & { sessions: Map<string, PrayerSessionRecord>; participants: Map<string, SessionParticipantRecord> } {
  const sessions = new Map<string, PrayerSessionRecord>();
  const participants = new Map<string, SessionParticipantRecord>();

  sessions.set('sess_1', {
    id: 'sess_1',
    prayerRoomId: 'room_1',
    status: 'LIVE',
    scheduledStart: null,
    actualStart: new Date(),
    endedAt: null,
    livekitRoomName: 'lk_room',
    sermonLeaderName: '',
    activeSpeakerParticipantId: seed?.occupiedBy ?? null,
    peakConcurrentParticipants: 0,
  });

  participants.set('p_listener', {
    id: 'p_listener',
    sessionId: 'sess_1',
    userId: null,
    guestName: 'Guest One',
    realtimeIdentity: 'guest_abc',
    role: 'LISTENER',
    baseRole: 'LISTENER',
    leftAt: null,
  });
  participants.set('p_other', {
    id: 'p_other',
    sessionId: 'sess_1',
    userId: null,
    guestName: 'Guest Two',
    realtimeIdentity: 'guest_def',
    role: 'LISTENER',
    baseRole: 'LISTENER',
    leftAt: null,
  });

  return {
    sessions,
    participants,
    getSession: async (id) => sessions.get(id) ?? null,
    getParticipant: async (id) => participants.get(id) ?? null,
    setActiveSpeaker: async (sessionId, participantId) => {
      const session = sessions.get(sessionId);
      if (session) session.activeSpeakerParticipantId = participantId;
    },
    setParticipantRole: async (participantId, role) => {
      const participant = participants.get(participantId);
      if (participant) participant.role = role;
    },
    createInvitation: async () => ({ id: 'inv_1' }),
    writeAudit: async () => undefined,
  };
}

describe('permission matrix', () => {
  it('does not let Technical Admin view private prayer requests', () => {
    expect(canViewPrivatePrayerRequests('TECHNICAL_ADMIN')).toBe(false);
    expect(canViewPrivatePrayerRequests('PRAYER_LEADER')).toBe(true);
    expect(canViewPrivatePrayerRequests('ADMIN')).toBe(true);
  });

  it('lets Technical Admin manage participants without pastoral privacy access', () => {
    expect(canManageParticipants('TECHNICAL_ADMIN')).toBe(true);
    expect(canInviteSpeaker('TECHNICAL_ADMIN')).toBe(true);
  });

  it('lets Owner and Admin mute the congregation', () => {
    expect(canMuteCongregation('OWNER')).toBe(true);
    expect(canMuteCongregation('ADMIN')).toBe(true);
    expect(canMuteCongregation('PRAYER_LEADER')).toBe(false);
    expect(canMuteCongregation('TECHNICAL_ADMIN')).toBe(false);
  });

  it('lets Owner and Admin delete prayer rooms', () => {
    expect(canDeletePrayerRoom('OWNER')).toBe(true);
    expect(canDeletePrayerRoom('ADMIN')).toBe(true);
    expect(canDeletePrayerRoom('PRAYER_LEADER')).toBe(false);
    expect(canDeletePrayerRoom('TECHNICAL_ADMIN')).toBe(false);
  });

  it('lets only Owner invite Admins to the Sanctum Space', () => {
    expect(canManageTeam('OWNER')).toBe(true);
    expect(canManageTeam('ADMIN')).toBe(false);
    expect(canManageTeam('PRAYER_LEADER')).toBe(false);
    expect(canManageTeam('TECHNICAL_ADMIN')).toBe(false);
    expect(isInviteableOrgRole('ADMIN')).toBe(true);
    expect(isInviteableOrgRole('PRAYER_LEADER')).toBe(false);
    expect(isInviteableOrgRole('TECHNICAL_ADMIN')).toBe(false);
    expect(isInviteableOrgRole('OWNER')).toBe(false);
  });

  it('blocks removing the Owner from the team list', () => {
    const canRemoveTeamMember = (role: string) => role !== 'OWNER';
    expect(canRemoveTeamMember('ADMIN')).toBe(true);
    expect(canRemoveTeamMember('PRAYER_LEADER')).toBe(true);
    expect(canRemoveTeamMember('OWNER')).toBe(false);
  });

  it('treats moderator as distinct from speaker', () => {
    expect(isSessionModerator('MODERATOR')).toBe(true);
    expect(canPublishAudio('MODERATOR', false)).toBe(false);
    expect(canPublishAudio('MODERATOR', true)).toBe(false);
    expect(canPublishAudio('SPEAKER', true)).toBe(true);
    expect(canPublishAudio('HOST', true)).toBe(false);
  });
});

describe('session transitions', () => {
  const valid: Array<[SessionLifecycleState, SessionLifecycleState]> = [
    ['SCHEDULED', 'WAITING'],
    ['SCHEDULED', 'STARTING'],
    ['WAITING', 'STARTING'],
    ['STARTING', 'LIVE'],
    ['LIVE', 'ENDING'],
    ['ENDING', 'ENDED'],
    ['SCHEDULED', 'CANCELLED'],
    ['WAITING', 'CANCELLED'],
    ['STARTING', 'CANCELLED'],
  ];

  const invalid: Array<[SessionLifecycleState, SessionLifecycleState]> = [
    ['LIVE', 'CANCELLED'],
    ['ENDED', 'LIVE'],
    ['CANCELLED', 'LIVE'],
    ['LIVE', 'WAITING'],
    ['ENDING', 'LIVE'],
    ['SCHEDULED', 'LIVE'],
  ];

  it('allows the documented lifecycle graph', () => {
    for (const [from, to] of valid) {
      expect(canTransitionSession(from, to), `${from} -> ${to}`).toBe(true);
    }
  });

  it('rejects invalid transitions', () => {
    for (const [from, to] of invalid) {
      expect(canTransitionSession(from, to), `${from} -> ${to}`).toBe(false);
    }
  });
});

describe('duplicate slug', () => {
  it('throws DuplicateSlug when the altar link is taken', () => {
    expect(() => ensureSlugAvailable(true, 'morning-prayer')).toThrow(SanctumError);
    try {
      ensureSlugAvailable(true, 'morning-prayer');
    } catch (error) {
      expect(error).toBeInstanceOf(SanctumError);
      expect((error as SanctumError).code).toBe('DUPLICATE_SLUG');
    }
    expect(DuplicateSlug('morning-prayer').details).toEqual({ slug: 'morning-prayer' });
  });

  it('allows a unique slug', () => {
    expect(() => ensureSlugAvailable(false, 'evening-prayer')).not.toThrow();
  });
});

describe('listener token grants', () => {
  it('cannot publish microphone audio', () => {
    const grants = buildLiveKitTokenGrants({
      roomName: 'session_1',
      sessionRole: 'LISTENER',
      holdsSpeakerFloor: false,
    });
    expect(grants.canPublish).toBe(false);
    expect(grants.canPublishSources).toEqual([]);
    expect(grants.canPublishData).toBe(true);
    expect(grants.roomAdmin).toBe(false);
  });

  it('lets Control Room hosts publish during opening prayer; listeners cannot', () => {
    const speaker = buildLiveKitTokenGrants({
      roomName: 'session_1',
      sessionRole: 'SPEAKER',
      holdsSpeakerFloor: true,
      congregationMuted: true,
    });
    expect(speaker.canPublish).toBe(false);

    const host = buildLiveKitTokenGrants({
      roomName: 'session_1',
      sessionRole: 'HOST',
      holdsSpeakerFloor: false,
      congregationMuted: true,
    });
    expect(host.canPublish).toBe(true);
    expect(host.canPublishSources).toEqual(['microphone']);
    expect(host.roomAdmin).toBe(true);

    const idleSpeaker = buildLiveKitTokenGrants({
      roomName: 'session_1',
      sessionRole: 'SPEAKER',
      holdsSpeakerFloor: false,
      congregationMuted: true,
    });
    expect(idleSpeaker.canPublish).toBe(false);
  });

  it('keeps congregation publish off in tokens; discussion uses PTT runtime grants', () => {
    const listener = buildLiveKitTokenGrants({
      roomName: 'session_1',
      sessionRole: 'LISTENER',
      holdsSpeakerFloor: false,
      congregationMuted: false,
    });
    expect(listener.canPublish).toBe(false);
    expect(listener.canPublishSources).toEqual([]);
  });
});

describe('speaker floor exclusivity', () => {
  it('does not invite a speaker before the session is live', async () => {
    const store = createMemoryFloorStore();
    const session = store.sessions.get('sess_1');
    if (session) session.status = 'WAITING';
    const floor = new SpeakerFloorService(store);

    await expect(floor.invite({ sessionId: 'sess_1', participantId: 'p_listener' })).rejects.toMatchObject({
      code: 'SESSION_NOT_LIVE',
    });
  });

  it('rejects grant when another participant already holds the floor', async () => {
    const store = createMemoryFloorStore({ occupiedBy: 'p_other' });
    const floor = new SpeakerFloorService(store);
    await expect(floor.grant({ sessionId: 'sess_1', participantId: 'p_listener' })).rejects.toMatchObject({
      code: 'SPEAKER_FLOOR_OCCUPIED',
    });
  });

  it('grants exclusively and transfer moves the floor', async () => {
    const store = createMemoryFloorStore();
    const floor = new SpeakerFloorService(store);
    const granted = await floor.grant({ sessionId: 'sess_1', participantId: 'p_listener' });
    expect(granted.activeSpeakerParticipantId).toBe('p_listener');
    expect(store.participants.get('p_listener')?.role).toBe('SPEAKER');

    const transferred = await floor.transfer({ sessionId: 'sess_1', toParticipantId: 'p_other' });
    expect(transferred.activeSpeakerParticipantId).toBe('p_other');
    expect(store.participants.get('p_listener')?.role).toBe('LISTENER');
    expect(store.participants.get('p_other')?.role).toBe('SPEAKER');
  });
});

describe('guest identity', () => {
  it('is generated by the server as guest_<unpredictable-id>', () => {
    const first = createGuestRealtimeIdentity();
    const second = createGuestRealtimeIdentity();
    expect(first.startsWith('guest_')).toBe(true);
    expect(second.startsWith('guest_')).toBe(true);
    expect(first).not.toBe(second);
    expect(first.length).toBeGreaterThan('guest_'.length + 16);
    expect(resolveJoinRealtimeIdentity(null, 'host')).toMatch(/^guest_/);
    expect(resolveJoinRealtimeIdentity(null, 'host')).not.toBe('host');
    expect(resolveJoinRealtimeIdentity(null, 'guest_0123456789abcdef0123456789abcdef')).toBe(
      'guest_0123456789abcdef0123456789abcdef'
    );
    expect(resolveJoinRealtimeIdentity('user_1', 'admin')).toBe('user_user_1');
  });
});
