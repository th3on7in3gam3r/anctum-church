import {
  ParticipantNotFound,
  SessionNotFound,
  SpeakerFloorOccupied,
  SessionNotLive,
} from '../../shared/errors.ts';
import type { SessionRole } from '../../shared/roles.ts';
import { isLiveKitConfigured } from '../env.ts';
import type { ILiveKitRealtimeProvider } from '../realtime/livekitProvider.ts';
import type { PrayerSessionRecord, SessionParticipantRecord } from '../repositories/index.ts';

export interface SpeakerFloorStore {
  getSession(sessionId: string): Promise<PrayerSessionRecord | null>;
  getParticipant(participantId: string): Promise<SessionParticipantRecord | null>;
  setActiveSpeaker(sessionId: string, participantId: string | null): Promise<void>;
  setParticipantRole(participantId: string, role: SessionRole): Promise<void>;
  createInvitation(input: { sessionId: string; participantId: string; invitedById?: string | null }): Promise<{ id: string }>;
  writeAudit(input: {
    sessionId: string;
    actorId?: string | null;
    action: 'SPEAKER_INVITED' | 'SPEAKER_GRANTED' | 'SPEAKER_REVOKED' | 'SPEAKER_TRANSFERRED';
    targetId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface SpeakerFloorResult {
  sessionId: string;
  activeSpeakerParticipantId: string | null;
  invitationId?: string;
}

export class SpeakerFloorService {
  constructor(
    private readonly store: SpeakerFloorStore,
    private readonly realtime?: ILiveKitRealtimeProvider
  ) {}

  async getCurrentSpeaker(sessionId: string): Promise<SessionParticipantRecord | null> {
    const session = await this.requireSession(sessionId);
    if (!session.activeSpeakerParticipantId) return null;
    return this.store.getParticipant(session.activeSpeakerParticipantId);
  }

  async invite(input: {
    sessionId: string;
    participantId: string;
    actorId?: string | null;
  }): Promise<SpeakerFloorResult> {
    const session = await this.requireSession(input.sessionId);
    if (session.status !== 'LIVE') throw SessionNotLive();
    const participant = await this.requireParticipant(input.participantId, input.sessionId);
    const invitation = await this.store.createInvitation({
      sessionId: session.id,
      participantId: participant.id,
      invitedById: input.actorId,
    });
    await this.store.writeAudit({
      sessionId: session.id,
      actorId: input.actorId,
      action: 'SPEAKER_INVITED',
      targetId: participant.id,
    });
    return {
      sessionId: session.id,
      activeSpeakerParticipantId: session.activeSpeakerParticipantId,
      invitationId: invitation.id,
    };
  }

  async grant(input: {
    sessionId: string;
    participantId: string;
    actorId?: string | null;
  }): Promise<SpeakerFloorResult> {
    const session = await this.requireSession(input.sessionId);
    const participant = await this.requireParticipant(input.participantId, input.sessionId);

    if (session.activeSpeakerParticipantId && session.activeSpeakerParticipantId !== participant.id) {
      throw SpeakerFloorOccupied(session.activeSpeakerParticipantId);
    }

    await this.store.setParticipantRole(participant.id, 'SPEAKER');
    await this.store.setActiveSpeaker(session.id, participant.id);
    await this.syncLiveKitPublish(session.livekitRoomName, participant.realtimeIdentity, true);
    await this.store.writeAudit({
      sessionId: session.id,
      actorId: input.actorId,
      action: 'SPEAKER_GRANTED',
      targetId: participant.id,
    });

    return { sessionId: session.id, activeSpeakerParticipantId: participant.id };
  }

  async revoke(input: {
    sessionId: string;
    participantId?: string;
    actorId?: string | null;
  }): Promise<SpeakerFloorResult> {
    const session = await this.requireSession(input.sessionId);
    const currentId = input.participantId ?? session.activeSpeakerParticipantId;
    if (!currentId) {
      return { sessionId: session.id, activeSpeakerParticipantId: null };
    }

    const participant = await this.requireParticipant(currentId, input.sessionId);
    await this.store.setParticipantRole(participant.id, participant.baseRole || 'LISTENER');
    await this.store.setActiveSpeaker(session.id, null);
    await this.syncLiveKitPublish(session.livekitRoomName, participant.realtimeIdentity, false);
    await this.store.writeAudit({
      sessionId: session.id,
      actorId: input.actorId,
      action: 'SPEAKER_REVOKED',
      targetId: participant.id,
    });

    return { sessionId: session.id, activeSpeakerParticipantId: null };
  }

  async transfer(input: {
    sessionId: string;
    toParticipantId: string;
    actorId?: string | null;
  }): Promise<SpeakerFloorResult> {
    const session = await this.requireSession(input.sessionId);
    const next = await this.requireParticipant(input.toParticipantId, input.sessionId);
    const previousId = session.activeSpeakerParticipantId;

    if (previousId && previousId !== next.id) {
      const previous = await this.requireParticipant(previousId, input.sessionId);
      await this.store.setParticipantRole(previous.id, previous.baseRole || 'LISTENER');
      await this.syncLiveKitPublish(session.livekitRoomName, previous.realtimeIdentity, false);
    }

    await this.store.setParticipantRole(next.id, 'SPEAKER');
    await this.store.setActiveSpeaker(session.id, next.id);
    await this.syncLiveKitPublish(session.livekitRoomName, next.realtimeIdentity, true);
    await this.store.writeAudit({
      sessionId: session.id,
      actorId: input.actorId,
      action: 'SPEAKER_TRANSFERRED',
      targetId: next.id,
      metadata: previousId ? { fromParticipantId: previousId } : undefined,
    });

    return { sessionId: session.id, activeSpeakerParticipantId: next.id };
  }

  private async requireSession(sessionId: string): Promise<PrayerSessionRecord> {
    const session = await this.store.getSession(sessionId);
    if (!session) throw SessionNotFound(sessionId);
    return session;
  }

  private async requireParticipant(participantId: string, sessionId: string): Promise<SessionParticipantRecord> {
    const participant = await this.store.getParticipant(participantId);
    if (!participant || participant.sessionId !== sessionId) {
      throw ParticipantNotFound(participantId);
    }
    return participant;
  }

  private async syncLiveKitPublish(roomName: string | null, identity: string, canPublish: boolean): Promise<void> {
    if (!isLiveKitConfigured() || !this.realtime || !roomName) return;
    await this.realtime.updatePublishPermission(roomName, identity, canPublish);
    if (!canPublish) {
      await this.realtime.muteParticipant(roomName, identity);
    }
  }
}
