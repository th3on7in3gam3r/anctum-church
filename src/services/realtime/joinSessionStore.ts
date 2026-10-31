const JOIN_KEY = 'sanctum_live_join';

export interface StoredJoin {
  sessionId: string;
  participantId: string;
  realtimeIdentity: string;
  token: string;
  livekitUrl: string;
  guestName: string;
  asGuest?: boolean;
  passcode?: string;
}

export function saveJoinSession(join: StoredJoin): void {
  try {
    sessionStorage.setItem(JOIN_KEY, JSON.stringify(join));
  } catch {
    /* ignore */
  }
}

export function loadJoinSession(): StoredJoin | null {
  try {
    const raw = sessionStorage.getItem(JOIN_KEY);
    return raw ? (JSON.parse(raw) as StoredJoin) : null;
  } catch {
    return null;
  }
}

export function clearJoinSession(): void {
  try {
    sessionStorage.removeItem(JOIN_KEY);
  } catch {
    /* ignore */
  }
}
