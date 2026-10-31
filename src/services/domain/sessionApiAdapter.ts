import { ApiClientError, sanctumApi } from '../api/sanctumApi';
import { isServerSessionId } from './sessionSnapshot';

const UNCONFIGURED = 'LiveKit connection unavailable in this environment.';

export { isServerSessionId };

async function callOrUnavailable(run: () => Promise<unknown>): Promise<{ ok: boolean; reason?: string }> {
  try {
    await run();
    return { ok: true };
  } catch (error) {
    if (error instanceof ApiClientError) {
      return { ok: false, reason: error.message };
    }
    return { ok: false, reason: UNCONFIGURED };
  }
}

export const sessionApiAdapter = {
  async join(
    sessionId: string | undefined,
    guestName: string,
    actor?: { userId?: string; organizationId?: string },
    options?: { asGuest?: boolean; connectionKind?: 'listener' | 'control'; realtimeIdentity?: string; passcode?: string }
  ) {
    if (!isServerSessionId(sessionId)) {
      return { ok: false as const, reason: UNCONFIGURED, participant: null, token: null, livekitUrl: null };
    }
    try {
      const asGuest = options?.asGuest === true || !actor?.userId;
      const result = await sanctumApi.joinSession(
        sessionId,
        {
          guestName,
          userId: asGuest ? undefined : actor?.userId,
          asGuest,
          connectionKind: options?.connectionKind || 'listener',
          realtimeIdentity: options?.realtimeIdentity,
          passcode: options?.passcode,
        },
        asGuest ? undefined : actor
      );
      return {
        ok: true as const,
        reason: undefined,
        participant: result.participant,
        token: result.token,
        livekitUrl: result.livekitUrl,
        realtimeConfigured: result.realtimeConfigured,
      };
    } catch (error) {
      const reason = error instanceof ApiClientError ? error.message : UNCONFIGURED;
      return { ok: false as const, reason, participant: null, token: null, livekitUrl: null };
    }
  },

  async raiseHand(sessionId: string | undefined, participantId: string) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.raiseHand(sessionId, participantId));
  },

  async lowerHand(sessionId: string | undefined, participantId: string) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.lowerHand(sessionId, participantId));
  },

  async dismissHand(sessionId: string | undefined, handId: string, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.dismissHand(sessionId, handId, actor));
  },

  async inviteSpeaker(sessionId: string | undefined, participantId: string, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.inviteSpeaker(sessionId, participantId, actor));
  },

  async grantSpeaker(sessionId: string | undefined, participantId: string, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.grantSpeaker(sessionId, participantId, actor));
  },

  async acceptSpeaker(
    sessionId: string | undefined,
    input: { participantId: string; invitationId?: string; realtimeIdentity?: string }
  ) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.acceptSpeaker(sessionId, input));
  },

  async declineSpeaker(sessionId: string | undefined, participantId: string) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.declineSpeaker(sessionId, participantId));
  },

  async revokeSpeaker(
    sessionId: string | undefined,
    participantId: string,
    actor: { userId?: string; organizationId?: string },
    realtimeIdentity?: string
  ) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.revokeSpeaker(sessionId, participantId, actor, realtimeIdentity));
  },

  async muteParticipant(sessionId: string | undefined, participantId: string, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.muteParticipant(sessionId, participantId, actor));
  },

  async unmuteParticipant(sessionId: string | undefined, participantId: string, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.unmuteParticipant(sessionId, participantId, actor));
  },

  async removeParticipant(sessionId: string | undefined, participantId: string, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.removeParticipant(sessionId, participantId, actor));
  },

  async leaveSession(sessionId: string | undefined, participantId: string) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.leaveSession(sessionId, participantId));
  },

  async endSession(sessionId: string | undefined, actor: { userId?: string; organizationId?: string }) {
    if (!isServerSessionId(sessionId)) return { ok: false, reason: UNCONFIGURED };
    return callOrUnavailable(() => sanctumApi.endPrayerSession(sessionId, actor));
  },
};
