import type { ChurchAccess, FeatureKey } from '../../../shared/churchSetup.ts';
export type RealtimeEngineStatus = 'configured' | 'not_configured' | 'unreachable';

export interface ApiHealth {
  ok: boolean;
  database: 'configured' | 'unavailable';
  livekit: 'configured' | 'unavailable';
  clerk?: 'configured' | 'unavailable';
  realtimeEngine: 'configured' | 'not_configured';
}

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: Record<string, string> | null;

  constructor(code: string, message: string, status: number, fieldErrors: Record<string, string> | null = null) {
    super(message);
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }
}

type Actor = { userId?: string; organizationId?: string };

let getAccessToken: (() => Promise<string | null>) | null = null;

export function setApiAccessTokenGetter(getter: (() => Promise<string | null>) | null): void {
  getAccessToken = getter;
}

async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { withAuth?: boolean; organizationId?: string }
): Promise<T> {
  const token = options?.withAuth && getAccessToken ? await getAccessToken() : null;
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.organizationId ? { 'x-organization-id': options.organizationId } : {}),
    },
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const details = body.details && typeof body.details === 'object' ? body.details : null;
    const fieldErrors =
      details &&
      'fieldErrors' in details &&
      details.fieldErrors &&
      typeof details.fieldErrors === 'object'
        ? (details.fieldErrors as Record<string, string>)
        : null;
    throw new ApiClientError(
      typeof body.error === 'string' ? body.error : 'REQUEST_FAILED',
      typeof body.message === 'string' ? body.message : 'Request failed',
      response.status,
      fieldErrors
    );
  }
  return body as T;
}

function staff(actor?: Actor) {
  return { withAuth: true as const, organizationId: actor?.organizationId };
}

export async function fetchHealth(): Promise<ApiHealth | null> {
  try {
    return await apiFetch<ApiHealth>('/api/health');
  } catch {
    return null;
  }
}

export function healthToEngineStatus(health: ApiHealth | null): RealtimeEngineStatus {
  if (!health) return 'unreachable';
  return health.livekit === 'configured' ? 'configured' : 'not_configured';
}

export const sanctumApi = {
  fetchHealth,
  fetchMe: () =>
    apiFetch<{
      needsOnboarding?: boolean;
      user: {
        id: string;
        name: string;
        email: string;
        role: string | null;
        organizationId: string | null;
        memberName?: string | null;
      };
      organization: Record<string, unknown> | null;
      access?: ChurchAccess | null;
      features?: Record<FeatureKey, boolean> | null;
    }>('/api/me', undefined, { withAuth: true }),
  createSpace: (input: { name: string; slug?: string; logoUrl?: string }) =>
    apiFetch<{
      organization: Record<string, unknown>;
      user: { id: string; name: string; email: string; role: string; organizationId: string };
    }>('/api/spaces', { method: 'POST', body: JSON.stringify(input) }, { withAuth: true }),
  updateCurrentSpace: (input: Record<string, unknown>, actor: Actor) =>
    apiFetch<{ organization: Record<string, unknown> }>(
      '/api/spaces/current',
      { method: 'PATCH', body: JSON.stringify(input) },
      staff(actor)
    ),
  deleteCurrentSpace: (input: { confirmName: string }, actor: Actor) =>
    apiFetch<{ ok: true }>(
      '/api/spaces/current',
      { method: 'DELETE', body: JSON.stringify(input) },
      staff(actor)
    ),
  listHostCandidates: (actor: Actor) =>
    apiFetch<{
      members: Array<{ userId: string; name: string; email: string; role: string }>;
    }>('/api/prayer-rooms/host-candidates', undefined, staff(actor)),
  listTeam: (actor: Actor) =>
    apiFetch<{
      members: Array<{ userId: string; name: string; email: string; role: string; status: string; canPublishGallery?: boolean }>;
    }>('/api/team', undefined, staff(actor)),
  inviteTeamMember: (input: { email: string; phone?: string; role: string }, actor: Actor) =>
    apiFetch<{
      member: { userId: string; name: string; email: string; role: string; status: string };
      clerkInviteSent: boolean;
    }>(
      '/api/team/invite',
      { method: 'POST', body: JSON.stringify(input) },
      staff(actor)
    ),
  setGalleryPublisher: (userId: string, canPublishGallery: boolean, actor: Actor) =>
    apiFetch<{ userId: string; canPublishGallery: boolean }>(
      `/api/team/${userId}/gallery`,
      { method: 'PATCH', body: JSON.stringify({ canPublishGallery }) },
      staff(actor)
    ),
  removeTeamMember: (userId: string, actor: Actor) =>
    apiFetch<{ ok: true; userId: string }>(
      `/api/team/${encodeURIComponent(userId)}`,
      { method: 'DELETE' },
      staff(actor)
    ),
  listPrayerRooms: (actor: Actor) =>
    apiFetch<{ rooms: Array<Record<string, unknown>> }>('/api/prayer-rooms', undefined, staff(actor)),
  createPrayerRoom: (input: Record<string, unknown>, actor: Actor) =>
    apiFetch<{ room: Record<string, unknown> }>('/api/prayer-rooms', {
      method: 'POST',
      body: JSON.stringify(input),
    }, staff(actor)),
  updatePrayerRoom: (roomId: string, input: Record<string, unknown>, actor: Actor) =>
    apiFetch<{ room: Record<string, unknown> }>(`/api/prayer-rooms/${encodeURIComponent(roomId)}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    }, staff(actor)),
  deletePrayerRoom: (roomId: string, actor: Actor) =>
    apiFetch<{ ok: true }>(`/api/prayer-rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
    }, staff(actor)),
  createPrayerSession: (input: Record<string, unknown>, actor: Actor) =>
    apiFetch<{ session: Record<string, unknown> }>('/api/prayer-sessions', {
      method: 'POST',
      body: JSON.stringify(input),
    }, staff(actor)),
  startPrayerSession: (sessionId: string, actor: Actor) =>
    apiFetch<{ session: Record<string, unknown> }>(`/api/prayer-sessions/${sessionId}/start`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, staff(actor)),
  endPrayerSession: (sessionId: string, actor: Actor) =>
    apiFetch(`/api/prayer-sessions/${sessionId}/end`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, staff(actor)),
  setCongregationMute: (sessionId: string, muted: boolean, actor: Actor) =>
    apiFetch<{ session: Record<string, unknown>; liveState?: Record<string, unknown> }>(
      `/api/sessions/${sessionId}/congregation-mute`,
      {
        method: 'POST',
        body: JSON.stringify({ muted }),
      },
      staff(actor)
    ),
  startPtt: (sessionId: string, participantId: string) =>
    apiFetch<{ ok: true; liveState?: Record<string, unknown> }>(`/api/sessions/${sessionId}/ptt/start`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),
  endPtt: (sessionId: string, participantId: string) =>
    apiFetch<{ ok: true; liveState?: Record<string, unknown> }>(`/api/sessions/${sessionId}/ptt/end`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),
  startPrivatePrayer: (
    sessionId: string,
    input: { memberParticipantId: string; hostParticipantId?: string },
    actor: Actor
  ) =>
    apiFetch<{ ok: true; privatePrayer: Record<string, string>; liveState?: Record<string, unknown> }>(
      `/api/sessions/${sessionId}/private-prayer/start`,
      { method: 'POST', body: JSON.stringify(input) },
      staff(actor)
    ),
  endPrivatePrayer: (sessionId: string, actor: Actor) =>
    apiFetch<{ ok: true; liveState?: Record<string, unknown> }>(
      `/api/sessions/${sessionId}/private-prayer/end`,
      { method: 'POST', body: JSON.stringify({}) },
      staff(actor)
    ),
  joinSession: (
    sessionId: string,
    input: {
      guestName?: string;
      userId?: string;
      role?: string;
      asGuest?: boolean;
      connectionKind?: 'listener' | 'control';
      realtimeIdentity?: string;
      passcode?: string;
    },
    actor?: Actor
  ) =>
    apiFetch<{
      participant: {
        id: string;
        realtimeIdentity: string;
        role: string;
        guestName: string | null;
      };
      token: string | null;
      livekitUrl: string | null;
      realtimeConfigured: boolean;
    }>(
      `/api/sessions/${sessionId}/join`,
      {
        method: 'POST',
        body: JSON.stringify({
          ...input,
          asGuest: input.asGuest === true || !actor?.userId,
        }),
      },
      actor?.userId && input.asGuest !== true ? staff(actor) : undefined
    ),
  raiseHand: (sessionId: string, participantId: string) =>
    apiFetch(`/api/sessions/${sessionId}/raise-hand`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),
  inviteSpeaker: (sessionId: string, participantId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/speaker/invite`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }, staff(actor)),
  grantSpeaker: (sessionId: string, participantId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/speaker/grant`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }, staff(actor)),
  revokeSpeaker: (sessionId: string, participantId: string, actor: Actor, realtimeIdentity?: string) =>
    apiFetch(`/api/sessions/${sessionId}/speaker/revoke`, {
      method: 'POST',
      body: JSON.stringify({ participantId, realtimeIdentity }),
    }, actor.userId ? staff(actor) : undefined),
  transferSpeaker: (sessionId: string, participantId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/speaker/transfer`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }, staff(actor)),
  removeParticipant: (sessionId: string, participantId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/participants/${participantId}/remove`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, staff(actor)),
  openPrayerSession: (sessionId: string, sermonLeaderName: string, actor: Actor) =>
    apiFetch<{ session: Record<string, unknown> }>(`/api/prayer-sessions/${sessionId}/open`, {
      method: 'POST',
      body: JSON.stringify({ sermonLeaderName }),
    }, staff(actor)),
  openSessionForRoom: (roomId: string, actor: Actor, sermonLeaderName: string) =>
    apiFetch<{ session: Record<string, unknown> }>(`/api/prayer-rooms/${roomId}/open-session`, {
      method: 'POST',
      body: JSON.stringify({ prayerRoomId: roomId, sermonLeaderName }),
    }, staff(actor)),
  getSession: (sessionId: string) =>
    apiFetch<{
      canControl?: boolean;
      session: Record<string, unknown>;
      room?: {
        id?: string;
        name?: string;
        roomSermonLeaderName?: string;
        organization?: { name?: string; defaultSermonSpeaker?: string };
      } | null;
      activeSpeaker: Record<string, unknown> | null;
      participants: Array<Record<string, unknown>>;
      raisedHands: Array<Record<string, unknown>>;
      chatMessages?: Array<{
        id: string;
        displayName: string;
        body: string;
        createdAt?: string;
        timestamp?: string;
      }>;
      connectedNow: number;
      peakConcurrentParticipants: number;
      realtimeConfigured: boolean;
      liveState?: {
        pttParticipantId?: string | null;
        privatePrayer?: {
          hostParticipantId: string;
          memberParticipantId: string;
          hostRealtimeIdentity: string;
          memberRealtimeIdentity: string;
        } | null;
      };
    }>(`/api/sessions/${sessionId}`, undefined, { withAuth: true }),
  sendChat: (
    sessionId: string,
    input: { displayName: string; body: string; participantId?: string }
  ) =>
    apiFetch<{
      message: { id: string; displayName: string; body: string; timestamp: string };
    }>(`/api/sessions/${sessionId}/chat`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getAltar: (slug: string) =>
    apiFetch<{
      canControl?: boolean;
      room: {
        id: string;
        name: string;
        slug: string;
        organizationId?: string;
        organizationName?: string;
        defaultSermonSpeaker?: string;
        roomSermonLeaderName?: string;
        organizationLogoUrl?: string;
        logoUrl?: string;
        scheduledStart?: string;
        timezone?: string;
        isRecurring?: boolean;
        recurrenceRule?: string | null;
        selectedDays?: string[];
        oneTimeDate?: string | null;
        durationMinutes?: number;
        speakerPermission?: string;
        allowGuests?: boolean;
        hasPasscode?: boolean;
        prayerRequestsEnabled?: boolean;
        anonymousRequestsAllowed?: boolean;
        chatEnabled?: boolean;
      };
      session: { id: string; status: string; sermonLeaderName?: string | null } | null;
    }>(`/api/altar/${encodeURIComponent(slug)}`, undefined, { withAuth: true }),
  listLiveAltars: (organizationSlug?: string) => {
    const query = organizationSlug ? `?organization=${encodeURIComponent(organizationSlug)}` : '';
    return apiFetch<{
      rooms: Array<{
        slug: string;
        name: string;
        organizationName: string;
        organizationSlug: string;
        sessionId: string;
        status: string;
      }>;
    }>(`/api/altar/live${query}`);
  },
  leaveSession: (sessionId: string, participantId: string) =>
    apiFetch(`/api/sessions/${sessionId}/leave`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),
  lowerHand: (sessionId: string, participantId: string) =>
    apiFetch(`/api/sessions/${sessionId}/lower-hand`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),
  dismissHand: (sessionId: string, handId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/hands/${handId}/dismiss`, {
      method: 'POST',
      body: JSON.stringify({}),
    }, staff(actor)),
  acceptSpeaker: (
    sessionId: string,
    input: { participantId: string; invitationId?: string; realtimeIdentity?: string }
  ) =>
    apiFetch<{ speakerFloor: { sessionId: string; activeSpeakerParticipantId: string | null }; invitationId: string }>(
      `/api/sessions/${sessionId}/speaker/accept`,
      {
      method: 'POST',
      body: JSON.stringify(input),
      }
    ),
  declineSpeaker: (sessionId: string, participantId: string) =>
    apiFetch(`/api/sessions/${sessionId}/speaker/decline`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }),
  muteParticipant: (sessionId: string, participantId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/participants/${participantId}/mute`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }, staff(actor)),
  unmuteParticipant: (sessionId: string, participantId: string, actor: Actor) =>
    apiFetch(`/api/sessions/${sessionId}/participants/${participantId}/unmute`, {
      method: 'POST',
      body: JSON.stringify({ participantId }),
    }, staff(actor)),
  helpChat: (
    input: {
      message: string;
      pageContext?: string;
      history?: Array<{ role: 'user' | 'assistant'; content: string }>;
    },
    actor?: Actor
  ) =>
    apiFetch<{ reply: string }>(
      '/api/help/chat',
      {
        method: 'POST',
        body: JSON.stringify(input),
      },
      staff(actor)
    ),
};

/** Signed-in request for the newer staff endpoints (Church setup, demo). */
export function staffFetch<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init, { withAuth: true });
}
