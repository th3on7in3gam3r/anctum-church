import { Role, ConnectionQuality } from '../../types';

export type RealtimeEventType =
  | 'CONNECTED'
  | 'DISCONNECTED'
  | 'PARTICIPANT_JOINED'
  | 'PARTICIPANT_LEFT'
  | 'HAND_RAISED'
  | 'HAND_LOWERED'
  | 'SPEAKER_INVITED'
  | 'SPEAKER_ACCEPTED'
  | 'SPEAKER_FINISHED'
  | 'PARTICIPANT_MUTED'
  | 'PARTICIPANT_REMOVED'
  | 'ROLE_UPDATED'
  | 'REACTION_SENT'
  | 'SESSION_ENDED'
  | 'SESSION_STARTED'
  | 'FLOOR_CHANGED'
  | 'HAND_DISMISSED'
  | 'SPEAKER_DECLINED'
  | 'ACTIVE_SPEAKER_CHANGED'
  | 'CHAT_MESSAGE'
  | 'CONGREGATION_MUTED'
  | 'MIC_STATE_CHANGED'
  | 'PTT_STARTED'
  | 'PTT_ENDED'
  | 'PRIVATE_PRAYER_STARTED'
  | 'PRIVATE_PRAYER_ENDED';

export interface RealtimeEventPayload {
  type: RealtimeEventType;
  sessionId: string;
  participantId?: string;
  displayName?: string;
  role?: Role;
  muted?: boolean;
  realtimeIdentity?: string;
  hostParticipantId?: string;
  memberParticipantId?: string;
  hostRealtimeIdentity?: string;
  memberRealtimeIdentity?: string;
  liveState?: {
    pttParticipantId?: string | null;
    privatePrayer?: {
      hostParticipantId: string;
      memberParticipantId: string;
      hostRealtimeIdentity: string;
      memberRealtimeIdentity: string;
    } | null;
  };
  reactionEmoji?: string;
  activeSpeakerName?: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export type RealtimeEventListener = (event: RealtimeEventPayload) => void;

export interface IRealtimeProvider {
  readonly isDevelopment: boolean;
  
  // Connection lifecycle
  joinRoom(params: {
    roomSlug: string;
    displayName: string;
    role: Role;
    token?: string;
    livekitUrl?: string;
  }): Promise<{ sessionId: string; participantId: string; connectionQuality: ConnectionQuality }>;

  leaveRoom(sessionId: string, participantId: string): Promise<void>;

  // Attendee member interactions
  raiseHand(sessionId: string, participantId: string): Promise<void>;
  lowerHand(sessionId: string, participantId: string): Promise<void>;
  sendReaction(sessionId: string, participantId: string, emoji: 'AMEN' | 'PRAISE_GOD'): Promise<void>;
  
  // Speaker lifecycle (Invited speaker flow)
  acceptSpeakerInvitation(sessionId: string, participantId: string): Promise<void>;
  finishSpeaking(sessionId: string, participantId: string): Promise<void>;

  // Moderator / Control room actions
  inviteSpeaker(sessionId: string, participantId: string, adminId: string): Promise<void>;
  muteParticipant(sessionId: string, participantId: string, adminId: string): Promise<void>;
  removeParticipant(sessionId: string, participantId: string, adminId: string): Promise<void>;
  updateParticipantRole(sessionId: string, participantId: string, newRole: Role, adminId: string): Promise<void>;
  endSession(sessionId: string, adminId: string): Promise<void>;

  // Event Subscription
  subscribe(callback: RealtimeEventListener): () => void;
}
