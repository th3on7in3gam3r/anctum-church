import type {
  ConnectionQuality,
  ConnectionState,
  Participant,
  PrayerRoom,
  PrayerSession,
  RaisedHand,
  Role,
} from '../../types';

export function isServerSessionId(sessionId: string | undefined | null): sessionId is string {
  return Boolean(sessionId && !sessionId.startsWith('session_'));
}

export function mapSessionRole(role: string | undefined): Role {
  if (role === 'SPEAKER') return 'SPEAKER';
  if (role === 'HOST') return 'ADMIN';
  if (role === 'MODERATOR') return 'PRAYER_LEADER';
  return 'LISTENER';
}

export function connectionStateToQuality(state: ConnectionState): ConnectionQuality {
  if (state === 'CONNECTED') return 'GOOD';
  if (state === 'CONNECTING' || state === 'RECONNECTING' || state === 'DEGRADED') return 'RECONNECTING';
  return 'OFFLINE';
}

export function mapServerPrayerRoom(row: Record<string, unknown>): PrayerRoom {
  const recurrence = row.recurrenceRule;
  const recurrenceRule =
    recurrence === 'WEEKLY' || recurrence === 'SELECTED_DAYS' || recurrence === 'DAILY'
      ? recurrence
      : undefined;
  const status = String(row.status || 'SCHEDULED');
  return {
    id: String(row.id),
    organizationId: String(row.organizationId),
    name: String(row.name),
    slug: String(row.slug),
    description: typeof row.description === 'string' ? row.description : undefined,
    logoUrl: typeof row.logoUrl === 'string' && row.logoUrl.trim() ? row.logoUrl.trim() : undefined,
    roomType: (typeof row.roomType === 'string' ? row.roomType : 'AUDIO_PRAYER') as PrayerRoom['roomType'],
    expectedAttendance: Number(row.expectedAttendance || 0),
    speakerPermission: (typeof row.speakerPermission === 'string'
      ? row.speakerPermission
      : 'ADMIN_APPROVAL_REQUIRED') as PrayerRoom['speakerPermission'],
    isRecurring: Boolean(row.isRecurring),
    recurrenceRule,
    selectedDays: Array.isArray(row.selectedDays)
      ? row.selectedDays.filter((day): day is string => typeof day === 'string')
      : [],
    oneTimeDate: typeof row.oneTimeDate === 'string' && row.oneTimeDate ? row.oneTimeDate : undefined,
    durationMinutes: Number(row.durationMinutes || 60),
    scheduledStart: String(row.scheduledStart || '05:00 AM'),
    timezone: String(row.timezone || 'Africa/Kampala'),
    recordingEnabled: Boolean(row.recordingEnabled),
    allowGuests: row.allowGuests !== false,
    prayerRequestsEnabled: row.prayerRequestsEnabled !== false,
    anonymousRequestsAllowed: row.anonymousRequestsAllowed !== false,
    chatEnabled: row.chatEnabled !== false,
    hasPasscode: Boolean(row.hasPasscode),
    sermonLeaderUserId: typeof row.sermonLeaderUserId === 'string' ? row.sermonLeaderUserId : undefined,
    coHostUserIds: Array.isArray(row.coHostUserIds)
      ? row.coHostUserIds.filter((id): id is string => typeof id === 'string')
      : [],
    status: status === 'LIVE' ? 'LIVE' : 'SCHEDULED',
    isArchived: status === 'ARCHIVED',
    livekitRoomName: typeof row.livekitRoomName === 'string' ? row.livekitRoomName : undefined,
    permanentUrl: String(row.permanentUrl || `/join/${row.slug}`),
    createdAt: row.createdAt ? String(row.createdAt) : new Date().toISOString(),
    updatedAt: row.updatedAt ? String(row.updatedAt) : new Date().toISOString(),
  };
}

export function mapServerSession(
  session: Record<string, unknown>,
  room: PrayerRoom,
  extras?: Partial<PrayerSession>
): PrayerSession {
  const status = String(session.status || 'SCHEDULED') as PrayerSession['status'];
  const peak = Number(session.peakConcurrentParticipants || extras?.peakConcurrentParticipants || 0);
  const connected = extras?.totalParticipants ?? extras?.totalUniqueParticipants ?? 0;
  return {
    id: String(session.id),
    prayerRoomId: String(session.prayerRoomId || room.id),
    roomName: room.name,
    organizationName: extras?.organizationName?.trim() || '',
    status,
    waitingRoomOpenedAt:
      status === 'WAITING' ? extras?.waitingRoomOpenedAt || new Date().toISOString() : extras?.waitingRoomOpenedAt,
    startedAt: session.actualStart ? String(session.actualStart) : extras?.startedAt,
    endedAt: session.endedAt ? String(session.endedAt) : extras?.endedAt,
    sermonLeaderName:
      typeof session.sermonLeaderName === 'string' ? session.sermonLeaderName : extras?.sermonLeaderName,
    durationSeconds: extras?.durationSeconds ?? 0,
    totalUniqueParticipants: connected,
    peakConcurrentParticipants: peak,
    totalParticipants: connected,
    peakParticipants: peak,
    listenersWaitingCount: extras?.listenersWaitingCount ?? connected,
    activeSpeakerName: extras?.activeSpeakerName,
    activeSpeakerTitle: extras?.activeSpeakerTitle,
    speakerDurationSeconds: extras?.speakerDurationSeconds ?? 0,
    congregationMuted: session.congregationMuted !== false,
    pttParticipantId: extras?.pttParticipantId ?? null,
    privatePrayer: extras?.privatePrayer ?? null,
    createdAt: session.createdAt ? String(session.createdAt) : new Date().toISOString(),
  };
}

export function mapSnapshotParticipants(
  rows: Array<Record<string, unknown>>,
  sessionId: string,
  quality: ConnectionQuality
): Participant[] {
  return rows
    .filter((row) => !row.leftAt)
    .map((row) => ({
      id: String(row.id),
      sessionId,
      externalIdentity: typeof row.realtimeIdentity === 'string' ? row.realtimeIdentity : undefined,
      displayName: String(row.guestName || (row.user as { name?: string } | undefined)?.name || 'Attendee'),
      role: mapSessionRole(typeof row.role === 'string' ? row.role : undefined),
      joinedAt: row.joinedAt ? String(row.joinedAt) : new Date().toISOString(),
      isHandRaised: false,
      isMuted: String(row.role) !== 'SPEAKER',
      connectionQuality: quality,
    }));
}

export function mapSnapshotHands(
  rows: Array<Record<string, unknown>>,
  sessionId: string,
  participants: Participant[]
): RaisedHand[] {
  return rows.map((row) => {
    const participantId = String(row.participantId || '');
    const nested = row.participant as Record<string, unknown> | undefined;
    const nestedUser = nested?.user as { name?: string } | undefined;
    const fromParticipant = participants.find((participant) => participant.id === participantId);
    return {
      id: String(row.id),
      sessionId,
      participantId,
      displayName: String(nested?.guestName || nestedUser?.name || fromParticipant?.displayName || 'Attendee'),
      status: (typeof row.status === 'string' ? row.status : 'WAITING') as RaisedHand['status'],
      raisedAt: row.raisedAt ? String(row.raisedAt) : new Date().toISOString(),
      waitingSeconds: 0,
    };
  });
}
