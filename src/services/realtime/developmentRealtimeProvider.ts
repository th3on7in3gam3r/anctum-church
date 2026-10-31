import { Role, ConnectionQuality } from '../../types';
import { IRealtimeProvider, RealtimeEventListener, RealtimeEventPayload } from './types';
import { AuditLogger } from '../../lib/audit';

/**
 * DevelopmentRealtimeProvider
 *
 * Prototype in-memory adapter retained for Phase 1A UI event simulation only.
 * It is not used as a LiveKit stand-in. Join, token minting, and moderation
 * that require the media engine go through server/ API routes and return
 * RealtimeUnavailable when LiveKit is not configured.
 */
export class DevelopmentRealtimeProvider implements IRealtimeProvider {
  public readonly isDevelopment = true;
  private listeners: Set<RealtimeEventListener> = new Set();
  private currentSessionId: string = 'session_morning_prayer_live';

  private emit(event: RealtimeEventPayload) {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[Sanctum Realtime] Listener error:', err);
      }
    });
  }

  async joinRoom(params: {
    roomSlug: string;
    displayName: string;
    role: Role;
    token?: string;
  }): Promise<{ sessionId: string; participantId: string; connectionQuality: ConnectionQuality }> {
    const participantId = `p_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const sessionId = this.currentSessionId;

    this.emit({
      type: 'PARTICIPANT_JOINED',
      sessionId,
      participantId,
      displayName: params.displayName,
      role: params.role,
      timestamp: new Date().toISOString(),
    });

    return {
      sessionId,
      participantId,
      connectionQuality: 'EXCELLENT',
    };
  }

  async leaveRoom(sessionId: string, participantId: string): Promise<void> {
    this.emit({
      type: 'PARTICIPANT_LEFT',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async raiseHand(sessionId: string, participantId: string): Promise<void> {
    this.emit({
      type: 'HAND_RAISED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async lowerHand(sessionId: string, participantId: string): Promise<void> {
    this.emit({
      type: 'HAND_LOWERED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async sendReaction(sessionId: string, participantId: string, emoji: 'AMEN' | 'PRAISE_GOD'): Promise<void> {
    this.emit({
      type: 'REACTION_SENT',
      sessionId,
      participantId,
      reactionEmoji: emoji === 'AMEN' ? '🙏' : '❤️',
      timestamp: new Date().toISOString(),
    });
  }

  async acceptSpeakerInvitation(sessionId: string, participantId: string): Promise<void> {
    this.emit({
      type: 'SPEAKER_ACCEPTED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async finishSpeaking(sessionId: string, participantId: string): Promise<void> {
    this.emit({
      type: 'SPEAKER_FINISHED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async inviteSpeaker(sessionId: string, participantId: string, adminId: string): Promise<void> {
    AuditLogger.log('INVITED_TO_SPEAK', {
      sessionId,
      adminId,
      adminName: 'Prayer Leader / Admin',
      participantId,
    });

    this.emit({
      type: 'SPEAKER_INVITED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async muteParticipant(sessionId: string, participantId: string, adminId: string): Promise<void> {
    AuditLogger.log('MUTED', {
      sessionId,
      adminId,
      adminName: 'Prayer Leader / Admin',
      participantId,
    });

    this.emit({
      type: 'PARTICIPANT_MUTED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async removeParticipant(sessionId: string, participantId: string, adminId: string): Promise<void> {
    AuditLogger.log('REMOVED', {
      sessionId,
      adminId,
      adminName: 'Prayer Leader / Admin',
      participantId,
    });

    this.emit({
      type: 'PARTICIPANT_REMOVED',
      sessionId,
      participantId,
      timestamp: new Date().toISOString(),
    });
  }

  async updateParticipantRole(
    sessionId: string,
    participantId: string,
    newRole: Role,
    adminId: string
  ): Promise<void> {
    AuditLogger.log('PROMOTED_TO_PRAYER_LEADER', {
      sessionId,
      adminId,
      adminName: 'Prayer Leader / Admin',
      participantId,
      metadata: { newRole },
    });

    this.emit({
      type: 'ROLE_UPDATED',
      sessionId,
      participantId,
      role: newRole,
      timestamp: new Date().toISOString(),
    });
  }

  async endSession(sessionId: string, adminId: string): Promise<void> {
    AuditLogger.log('SESSION_ENDED', {
      sessionId,
      adminId,
      adminName: 'Prayer Leader / Admin',
    });

    this.emit({
      type: 'SESSION_ENDED',
      sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  subscribe(callback: RealtimeEventListener): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
}

export const developmentRealtimeProvider = new DevelopmentRealtimeProvider();
