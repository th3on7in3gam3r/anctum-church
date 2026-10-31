export type Role = 'OWNER' | 'ADMIN' | 'PRAYER_LEADER' | 'TECHNICAL_ADMIN' | 'MEDIA' | 'SPEAKER' | 'LISTENER';

export type RoomType = 'AUDIO_PRAYER' | 'PRAYER_LEADER_VIDEO' | 'EVENT';

export type SpeakerPermissionMode = 'ADMIN_APPROVAL_REQUIRED' | 'PRAYER_LEADERS' | 'OPEN_MICROPHONE';

export type SessionLifecycleStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'WAITING'
  | 'STARTING'
  | 'LIVE'
  | 'ENDING'
  | 'ENDED'
  | 'CANCELLED'
  | 'FAILED';

// Backward compatibility alias
export type SessionStatus = SessionLifecycleStatus | 'COMPLETED';

export type ConnectionQuality = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'WEAK' | 'RECONNECTING' | 'OFFLINE';

export type ConnectionState = 'DISCONNECTED' | 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DEGRADED' | 'FAILED';

export type DataSaverMode = 'AUTOMATIC' | 'ON' | 'OFF';

export type RaisedHandStatus = 'WAITING' | 'INVITED' | 'DISMISSED' | 'RESOLVED';

export type PrayerRequestStatus = 'PENDING' | 'ANSWERED' | 'ARCHIVED';

export type AdminActionType =
  | 'SANCTUARY_OPENED'
  | 'PRE_PRAYER_CHECK_STARTED'
  | 'SESSION_STARTED'
  | 'SESSION_END_REQUESTED'
  | 'SESSION_ENDED'
  | 'SESSION_CANCELLED'
  | 'PARTICIPANT_INVITED_TO_SPEAK'
  | 'INVITED_TO_SPEAK'
  | 'PARTICIPANT_MUTED'
  | 'MUTED'
  | 'PARTICIPANT_RETURNED_TO_LISTENER'
  | 'RETURNED_TO_LISTENER'
  | 'PROMOTED_TO_PRAYER_LEADER'
  | 'ROLE_CHANGED'
  | 'PARTICIPANT_REMOVED'
  | 'REMOVED'
  | 'PARTICIPANT_BLOCKED'
  | 'BLOCKED'
  | 'ROOM_SETTINGS_CHANGED'
  | 'ROOM_UPDATED';

export type ReadinessCheckStatus = 'READY' | 'WARNING' | 'FAILED' | 'NOT_TESTED';

export interface PrePrayerReadinessReport {
  microphoneStatus: ReadinessCheckStatus;
  microphoneLabel?: string;
  audioOutputStatus: ReadinessCheckStatus;
  networkStatus: ReadinessCheckStatus;
  networkLatencyMs?: number;
  networkLabel?: string;
  prayerLeadersReadyCount: number;
  prayerLeadersTotalCount: number;
  listenersWaitingCount: number;
  recordingEnabled: boolean;
  listenerMicrophoneLock: boolean; // Must always be locked (listeners cannot unmute)
  allChecksPassed: boolean;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string;
  country: string;
  timezone: string;
  website?: string;
  primaryContactName: string;
  primaryContactEmail: string;
  phone?: string;
  accentColor?: string;
  primaryColor?: string;
  joinPageMessage?: string;
  youtubeChannelId?: string;
  youtubeChannelInput?: string;
  defaultSermonSpeaker?: string;
  speakerAliases?: string[];
  defaultRoomType: RoomType;
  defaultSpeakerPermission: SpeakerPermissionMode;
  defaultRecording: boolean;
  defaultExpectedAttendance: number;
  appName?: string;
  brandTheme?: string;
  terminology?: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  organizationId: string;
  name: string;
  memberName?: string;
  email: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerRoom {
  id: string;
  organizationId: string;
  name: string;
  slug: string;
  description?: string;
  /** Optional logo for this room only (public https image URL). */
  logoUrl?: string;
  roomType: RoomType;
  expectedAttendance: number;
  speakerPermission: SpeakerPermissionMode;
  isRecurring: boolean;
  recurrenceRule?: 'DAILY' | 'WEEKLY' | 'SELECTED_DAYS';
  selectedDays?: string[];
  /** YYYY-MM-DD wall date for a one-time gathering. */
  oneTimeDate?: string | null;
  durationMinutes?: number;
  scheduledStart: string; // e.g. "05:00 AM"
  timezone: string;
  recordingEnabled: boolean;
  allowGuests?: boolean;
  prayerRequestsEnabled?: boolean;
  anonymousRequestsAllowed?: boolean;
  chatEnabled?: boolean;
  hasPasscode?: boolean;
  sermonLeaderUserId?: string;
  coHostUserIds?: string[];
  status: SessionLifecycleStatus | 'SCHEDULED' | 'LIVE' | 'COMPLETED';
  livekitRoomName?: string;
  permanentUrl: string;
  currentSessionId?: string;
  isTestRoom?: boolean;
  /** Soft-deactivated rooms stay in storage so PrayerSession history is preserved. */
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PrayerSession {
  id: string;
  prayerRoomId: string;
  roomName: string;
  organizationName: string;
  status: SessionLifecycleStatus | 'COMPLETED';
  scheduledStartTime?: string;
  waitingRoomOpenedAt?: string;
  startedAt?: string;
  endedAt?: string;
  sermonLeaderName?: string | null;
  durationSeconds: number;
  // Core Analytics Definitions
  totalUniqueParticipants: number;
  peakConcurrentParticipants: number;
  totalParticipants: number; // Backward compat alias
  peakParticipants: number;  // Backward compat alias
  listenersWaitingCount?: number;
  activeSpeakerName?: string;
  activeSpeakerTitle?: string;
  speakerDurationSeconds?: number;
  congregationMuted?: boolean;
  /** Exclusive congregant currently holding the floor. */
  pttParticipantId?: string | null;
  /** Active private host↔member sideline (only those two hear each other). */
  privatePrayer?: {
    hostParticipantId: string;
    memberParticipantId: string;
    hostRealtimeIdentity: string;
    memberRealtimeIdentity: string;
  } | null;
  totalPrayerRequests?: number;
  totalRaisedHands?: number;
  totalSpeakerInvitations?: number;
  totalSpeakers?: number;
  isTestSession?: boolean;
  createdAt: string;
}

export interface Participant {
  id: string;
  sessionId: string;
  externalIdentity?: string;
  displayName: string;
  role: Role;
  isMuted?: boolean;
  speakingTimeSeconds?: number;
  joinedAt: string;
  leftAt?: string;
  connectionQuality: ConnectionQuality;
  isHandRaised?: boolean;
  handRaisedAt?: string;
  country?: string;
}

export interface RaisedHand {
  id: string;
  sessionId: string;
  participantId: string;
  displayName: string;
  status: RaisedHandStatus;
  raisedAt: string;
  waitingSeconds: number;
  country?: string;
  acceptedAt?: string;
  resolvedAt?: string;
}

export interface PrayerRequest {
  id: string;
  sessionId?: string;
  roomName?: string;
  participantId?: string;
  participantName: string;
  request: string;
  isPrivate: boolean;
  status: PrayerRequestStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminAction {
  id: string;
  sessionId?: string;
  adminId: string;
  adminName: string;
  participantId?: string;
  participantName?: string;
  action: AdminActionType;
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface RoleCapability {
  role: Role;
  label: string;
  description: string;
  canSpeakAutomatically: boolean;
  canInviteSpeakers: boolean;
  canMuteSpeakers: boolean;
  canManageRooms: boolean;
  canEndSessions: boolean;
  canViewPrivateRequests: boolean;
  canManageSettings: boolean;
}

export type ToastType =
  | 'success'
  | 'info'
  | 'warning'
  | 'error'
  | 'prayer_request'
  | 'participant_join'
  | 'hand_raised';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  timestamp?: string;
  actionLabel?: string;
  onAction?: () => void;
  meta?: {
    participantName?: string;
    roomName?: string;
    isPrivate?: boolean;
  };
}

export interface ConfirmActionOptions {
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  isDestructive?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}
