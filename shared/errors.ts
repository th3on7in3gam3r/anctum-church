export type SanctumErrorCode =
  | 'UNAUTHORIZED'
  | 'ROOM_NOT_FOUND'
  | 'SESSION_NOT_FOUND'
  | 'INVALID_SESSION_TRANSITION'
  | 'REALTIME_UNAVAILABLE'
  | 'DATABASE_UNAVAILABLE'
  | 'SPEAKER_FLOOR_OCCUPIED'
  | 'PARTICIPANT_NOT_FOUND'
  | 'DUPLICATE_SLUG'
  | 'SESSION_NOT_JOINABLE'
  | 'INVITATION_INVALID'
  | 'SESSION_NOT_LIVE'
  | 'SERMON_LEADER_REQUIRED'
  | 'VALIDATION_ERROR'
  | 'CMS_NOT_FOUND'
  | 'RATE_LIMITED'
  | 'FEATURE_OFF';

export class SanctumError extends Error {
  readonly code: SanctumErrorCode;
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(code: SanctumErrorCode, message: string, status = 400, details?: Record<string, unknown>) {
    super(message);
    this.name = 'SanctumError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const Unauthorized = (message = 'Not authorized for this action') =>
  new SanctumError('UNAUTHORIZED', message, 403);

export const RoomNotFound = (id?: string) =>
  new SanctumError('ROOM_NOT_FOUND', 'Prayer room not found', 404, id ? { id } : undefined);

export const SessionNotFound = (id?: string) =>
  new SanctumError('SESSION_NOT_FOUND', 'Prayer session not found', 404, id ? { id } : undefined);

export const InvalidSessionTransition = (from: string, to: string) =>
  new SanctumError(
    'INVALID_SESSION_TRANSITION',
    `Cannot transition prayer session from ${from} to ${to}`,
    409,
    { from, to }
  );

export const RealtimeUnavailable = (message = 'LiveKit connection unavailable in this environment.') =>
  new SanctumError('REALTIME_UNAVAILABLE', message, 503);

export const DatabaseUnavailable = (message = 'Database is not configured in this environment.') =>
  new SanctumError('DATABASE_UNAVAILABLE', message, 503);

export const SpeakerFloorOccupied = (currentSpeakerId?: string) =>
  new SanctumError(
    'SPEAKER_FLOOR_OCCUPIED',
    'Another participant currently holds the speaker floor.',
    409,
    currentSpeakerId ? { currentSpeakerId } : undefined
  );

export const ParticipantNotFound = (id?: string) =>
  new SanctumError('PARTICIPANT_NOT_FOUND', 'Session participant not found', 404, id ? { id } : undefined);

export const DuplicateSlug = (slug: string) =>
  new SanctumError(
    'DUPLICATE_SLUG',
    'This Permanent Altar Link is already in use.',
    409,
    { slug }
  );

export const SessionNotJoinable = (status?: string) =>
  new SanctumError(
    'SESSION_NOT_JOINABLE',
    'This prayer gathering is not open to join yet, or has already ended.',
    409,
    status ? { status } : undefined
  );

export const InvitationInvalid = (message = 'Speaker invitation is not active.') =>
  new SanctumError('INVITATION_INVALID', message, 409);

export const SessionNotLive = () =>
  new SanctumError('SESSION_NOT_LIVE', 'Prayer has not started.', 409);

export const SermonLeaderRequired = () =>
  new SanctumError('SERMON_LEADER_REQUIRED', 'Enter the sermon or prayer leader for this session.', 400);

export const CmsNotFound = (message = 'Church record not found') =>
  new SanctumError('CMS_NOT_FOUND', message, 404);

export const FeatureOff = (label: string) =>
  new SanctumError('FEATURE_OFF', `${label} is turned off for this church. A Super Admin or Developer can turn it on in Church setup.`, 403);

export const RateLimited = (message = 'Too many requests. Try again shortly.') =>
  new SanctumError('RATE_LIMITED', message, 429);

export class ValidationError extends SanctumError {
  readonly fieldErrors: Record<string, string>;

  constructor(fieldErrors: Record<string, string>, message = 'Please review the form errors') {
    super('VALIDATION_ERROR', message, 400, { fieldErrors });
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
