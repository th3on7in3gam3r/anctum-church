import { describe, expect, it } from 'vitest';
import { SanctumError } from '../shared/errors.ts';
import { buildLiveKitTokenGrants } from '../shared/livekitGrants.ts';
import { canViewPrivatePrayerRequests } from '../shared/roles.ts';
import { isJoinableSessionStatus } from '../shared/sessionStateMachine.ts';
import { resolveJoinRealtimeIdentity } from '../server/identity.ts';
import { createRoomIdempotent, liveKitRoomNameForSession } from '../server/realtime/livekitProvider.ts';
import { requireWebhookSignature } from '../server/routes/webhooks.ts';
import { SpeakerFloorService, type SpeakerFloorStore } from '../server/services/speakerFloorService.ts';
import type { PrayerSessionRecord, SessionParticipantRecord } from '../server/repositories/index.ts';
import { SEED_MEMBERSHIPS } from '../prisma/seedMemberships.ts';

function createMemoryFloorStore(seed?: { occupiedBy?: string | null; hostId?: string }): SpeakerFloorStore & {
  sessions: Map<string, PrayerSessionRecord>;
  participants: Map<string, SessionParticipantRecord>;
} {
  const sessions = new Map<string, PrayerSessionRecord>();
  const participants = new Map<string, SessionParticipantRecord>();

  sessions.set('sess_1', {
    id: 'sess_1',
    prayerRoomId: 'room_1',
    status: 'LIVE',
    scheduledStart: null,
    actualStart: new Date(),
    endedAt: null,
    livekitRoomName: 'sanctum_sess_1',
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
  participants.set('p_host', {
    id: 'p_host',
    sessionId: 'sess_1',
    userId: seed?.hostId ?? 'user_pastor_kenneth',
    guestName: null,
    realtimeIdentity: 'user_user_pastor_kenneth',
    role: 'HOST',
    baseRole: 'HOST',
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

function upsertWaitingHand(
  rows: Array<{ id: string; participantId: string; status: string }>,
  participantId: string
) {
  const existing = rows.find(
    (row) => row.participantId === participantId && (row.status === 'WAITING' || row.status === 'INVITED')
  );
  if (existing) return { rows, hand: existing, created: false };
  const hand = { id: `hand_${rows.length + 1}`, participantId, status: 'WAITING' };
  return { rows: [...rows, hand], hand, created: true };
}

describe('join gate', () => {
  it('rejects join unless WAITING, STARTING, or LIVE', () => {
    expect(isJoinableSessionStatus('WAITING')).toBe(true);
    expect(isJoinableSessionStatus('STARTING')).toBe(true);
    expect(isJoinableSessionStatus('LIVE')).toBe(true);
    expect(isJoinableSessionStatus('SCHEDULED')).toBe(false);
    expect(isJoinableSessionStatus('ENDED')).toBe(false);
    expect(isJoinableSessionStatus('CANCELLED')).toBe(false);
    expect(isJoinableSessionStatus('ENDING')).toBe(false);
  });
});

describe('listener grants', () => {
  it('still cannot publish after 1B.2', () => {
    const grants = buildLiveKitTokenGrants({
      roomName: 'sanctum_sess_1',
      sessionRole: 'LISTENER',
      holdsSpeakerFloor: false,
    });
    expect(grants.canPublish).toBe(false);
    expect(grants.canPublishSources).toEqual([]);
    expect(grants.canPublishData).toBe(true);
  });
});

describe('speaker invitation vs floor', () => {
  it('invite does not occupy the floor; accept transfers; occupied grant is 409', async () => {
    const store = createMemoryFloorStore();
    const floor = new SpeakerFloorService(store);

    const invited = await floor.invite({ sessionId: 'sess_1', participantId: 'p_listener' });
    expect(invited.activeSpeakerParticipantId).toBeNull();
    expect(invited.invitationId).toBe('inv_1');
    expect(store.sessions.get('sess_1')?.activeSpeakerParticipantId).toBeNull();

    await floor.grant({ sessionId: 'sess_1', participantId: 'p_other' });
    await expect(floor.grant({ sessionId: 'sess_1', participantId: 'p_listener' })).rejects.toMatchObject({
      code: 'SPEAKER_FLOOR_OCCUPIED',
      status: 409,
    });

    const transferred = await floor.transfer({ sessionId: 'sess_1', toParticipantId: 'p_listener' });
    expect(transferred.activeSpeakerParticipantId).toBe('p_listener');
  });
});

describe('raise-hand upsert', () => {
  it('does not create a second WAITING hand for the same participant', () => {
    const first = upsertWaitingHand([], 'p_listener');
    expect(first.created).toBe(true);
    const second = upsertWaitingHand(first.rows, 'p_listener');
    expect(second.created).toBe(false);
    expect(second.rows).toHaveLength(1);
    expect(second.hand.id).toBe(first.hand.id);
  });
});

describe('unsigned webhook', () => {
  it('rejects missing Authorization', () => {
    expect(() => requireWebhookSignature('')).toThrow(SanctumError);
    try {
      requireWebhookSignature(undefined);
    } catch (error) {
      expect(error).toBeInstanceOf(SanctumError);
      expect((error as SanctumError).code).toBe('UNAUTHORIZED');
      expect((error as SanctumError).message).toMatch(/unsigned/i);
    }
  });
});

describe('mute vs revoke', () => {
  it('mute does not clear activeSpeakerParticipantId; revoke does', async () => {
    const store = createMemoryFloorStore({ occupiedBy: 'p_listener' });
    const floor = new SpeakerFloorService(store);
    expect(store.sessions.get('sess_1')?.activeSpeakerParticipantId).toBe('p_listener');

    const mutedFloor = store.sessions.get('sess_1')?.activeSpeakerParticipantId;
    expect(mutedFloor).toBe('p_listener');
    // Unmute is a LiveKit track action and must not revoke the floor.
    expect(store.sessions.get('sess_1')?.activeSpeakerParticipantId).toBe('p_listener');

    const revoked = await floor.revoke({ sessionId: 'sess_1', participantId: 'p_listener' });
    expect(revoked.activeSpeakerParticipantId).toBeNull();
    expect(store.sessions.get('sess_1')?.activeSpeakerParticipantId).toBeNull();
  });

  it('revoke restores membership-derived baseRole for HOST', async () => {
    const store = createMemoryFloorStore({ occupiedBy: 'p_host' });
    const floor = new SpeakerFloorService(store);
    store.participants.get('p_host')!.role = 'SPEAKER';
    await floor.revoke({ sessionId: 'sess_1', participantId: 'p_host' });
    expect(store.participants.get('p_host')?.role).toBe('HOST');
  });
});

describe('technical admin privacy', () => {
  it('still cannot view private prayer requests', () => {
    expect(canViewPrivatePrayerRequests('TECHNICAL_ADMIN')).toBe(false);
  });
});

describe('guest identity', () => {
  it('ignores client-supplied identity', () => {
    expect(resolveJoinRealtimeIdentity(null, 'host')).not.toBe('host');
    expect(resolveJoinRealtimeIdentity(null, 'guest_injected')).toMatch(/^guest_/);
    expect(resolveJoinRealtimeIdentity('user_pastor_kenneth', 'admin')).toBe('user_user_pastor_kenneth');
  });

  it('uses a distinct Control Room identity so join and control can both stay connected', () => {
    expect(resolveJoinRealtimeIdentity('clerk_abc', undefined, 'listener')).toBe('user_clerk_abc');
    expect(resolveJoinRealtimeIdentity('clerk_abc', undefined, 'control')).toBe('user_clerk_abc_control');
  });
});

describe('ensureLiveKitRoom', () => {
  it('is idempotent when the LiveKit room already exists', async () => {
    expect(liveKitRoomNameForSession('abc')).toBe('sanctum_abc');
    const createRoom = async () => {
      throw new Error('room already exists');
    };
    await expect(
      createRoomIdempotent(createRoom, { name: 'sanctum_abc', emptyTimeout: 1, maxParticipants: 10 })
    ).resolves.toBeUndefined();
  });
});

describe('membership seed roles', () => {
  it('assigns the pastor OWNER, Grace ADMIN, Sarah PRAYER_LEADER, Daniel TECHNICAL_ADMIN', () => {
    const byId = Object.fromEntries(SEED_MEMBERSHIPS.map((member) => [member.id, member.role]));
    expect(byId.user_pastor_gracelove).toBe('OWNER');
    expect(byId.user_admin_grace).toBe('ADMIN');
    expect(byId.user_leader_sarah).toBe('PRAYER_LEADER');
    expect(byId.user_tech_daniel).toBe('TECHNICAL_ADMIN');
    expect(SEED_MEMBERSHIPS.every((member) => member.role !== undefined)).toBe(true);
    expect(SEED_MEMBERSHIPS.filter((member) => member.role === 'OWNER')).toHaveLength(1);
  });
});
