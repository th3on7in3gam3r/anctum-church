export type PrivatePrayerState = {
  hostParticipantId: string;
  memberParticipantId: string;
  hostRealtimeIdentity: string;
  memberRealtimeIdentity: string;
};

export type SessionLiveState = {
  pttParticipantId: string | null;
  privatePrayer: PrivatePrayerState | null;
};

const bySession = new Map<string, SessionLiveState>();

function emptyState(): SessionLiveState {
  return { pttParticipantId: null, privatePrayer: null };
}

export function getSessionLiveState(sessionId: string): SessionLiveState {
  return bySession.get(sessionId) || emptyState();
}

export function setPttParticipant(sessionId: string, participantId: string | null): SessionLiveState {
  const current = getSessionLiveState(sessionId);
  const next = { ...current, pttParticipantId: participantId };
  bySession.set(sessionId, next);
  return next;
}

export function setPrivatePrayer(
  sessionId: string,
  privatePrayer: PrivatePrayerState | null
): SessionLiveState {
  const current = getSessionLiveState(sessionId);
  const next = { ...current, privatePrayer };
  bySession.set(sessionId, next);
  return next;
}

export function clearSessionLiveState(sessionId: string): void {
  bySession.delete(sessionId);
}
