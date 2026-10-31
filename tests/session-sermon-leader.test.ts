import { describe, expect, it } from 'vitest';
import { normalizeSermonLeaderName } from '../shared/sessionLeader.ts';
import { mapServerSession, mapSnapshotParticipants } from '../src/services/domain/sessionSnapshot.ts';
import type { PrayerRoom } from '../src/types/index.ts';

const room: PrayerRoom = {
  id: 'room_1',
  organizationId: 'org_1',
  name: 'Morning Prayer',
  slug: 'morning-prayer',
  expectedAttendance: 25,
  roomType: 'AUDIO_PRAYER',
  speakerPermission: 'ADMIN_APPROVAL_REQUIRED',
  isRecurring: true,
  scheduledStart: '05:00 AM',
  timezone: 'Africa/Kampala',
  recordingEnabled: false,
  status: 'SCHEDULED',
  permanentUrl: '/join/morning-prayer',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

describe('session sermon leader', () => {
  it('rejects blank values and trims valid names', () => {
    expect(normalizeSermonLeaderName('')).toBeNull();
    expect(normalizeSermonLeaderName('   ')).toBeNull();
    expect(normalizeSermonLeaderName('  Pastor Grace  ')).toBe('Pastor Grace');
    expect(normalizeSermonLeaderName(undefined)).toBeNull();
  });

  it('maps the persisted leader name into the session snapshot', () => {
    const session = mapServerSession(
      {
        id: 'session_1',
        prayerRoomId: room.id,
        status: 'WAITING',
        sermonLeaderName: 'Pastor Grace',
      },
      room
    );

    expect(session.sermonLeaderName).toBe('Pastor Grace');
  });

  it('preserves separate participants who happen to share a display name', () => {
    const participants = mapSnapshotParticipants(
      [
        { id: 'participant_1', guestName: 'Less on Safari', realtimeIdentity: 'guest_1', role: 'LISTENER' },
        { id: 'participant_2', guestName: 'Less on Safari', realtimeIdentity: 'guest_2', role: 'LISTENER' },
      ],
      'session_1',
      'GOOD'
    );

    expect(participants.map((participant) => participant.id)).toEqual(['participant_1', 'participant_2']);
  });
});
