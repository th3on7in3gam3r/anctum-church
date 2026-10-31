export const DEFAULT_API_ORIGIN = 'https://sanctum.live';

export type LiveAltar = {
  slug: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
  sessionId: string;
  status: string;
};

export type AltarLookup = {
  room: { id: string; name: string; slug: string };
  session: { id: string; status: string } | null;
};

export type JoinResult = {
  participant: { id: string; realtimeIdentity: string };
  token: string;
  livekitUrl: string;
};

async function apiFetch<T>(origin: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = (await response.json().catch(() => ({}))) as { message?: string };
  if (!response.ok) {
    throw new Error(typeof body.message === 'string' ? body.message : 'Request failed');
  }
  return body as T;
}

export function listLiveAltars(origin: string) {
  return apiFetch<{ rooms: LiveAltar[] }>(origin, '/api/altar/live');
}

export function getAltar(origin: string, slug: string) {
  return apiFetch<AltarLookup>(origin, `/api/altar/${encodeURIComponent(slug)}`);
}

export function joinAsGuest(origin: string, sessionId: string, guestName: string) {
  return apiFetch<JoinResult>(origin, `/api/sessions/${sessionId}/join`, {
    method: 'POST',
    body: JSON.stringify({ asGuest: true, guestName }),
  });
}

export function leaveSession(origin: string, sessionId: string, participantId: string) {
  return apiFetch(origin, `/api/sessions/${sessionId}/leave`, {
    method: 'POST',
    body: JSON.stringify({ participantId }),
  });
}
