import { InvalidSessionTransition } from './errors.ts';

export type SessionLifecycleState =
  | 'SCHEDULED'
  | 'WAITING'
  | 'STARTING'
  | 'LIVE'
  | 'ENDING'
  | 'ENDED'
  | 'CANCELLED';

const ALLOWED_TRANSITIONS: Record<SessionLifecycleState, readonly SessionLifecycleState[]> = {
  SCHEDULED: ['WAITING', 'STARTING', 'CANCELLED'],
  WAITING: ['STARTING', 'CANCELLED'],
  STARTING: ['LIVE', 'CANCELLED'],
  LIVE: ['ENDING'],
  ENDING: ['ENDED'],
  ENDED: [],
  CANCELLED: [],
};

export function canTransitionSession(
  from: SessionLifecycleState,
  to: SessionLifecycleState
): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertCanTransitionSession(from: SessionLifecycleState, to: SessionLifecycleState): void {
  if (!canTransitionSession(from, to)) {
    throw InvalidSessionTransition(from, to);
  }
}

export function getAllowedTransitions(from: SessionLifecycleState): readonly SessionLifecycleState[] {
  return ALLOWED_TRANSITIONS[from] ?? [];
}

export function isTerminalSessionState(state: SessionLifecycleState): boolean {
  return state === 'ENDED' || state === 'CANCELLED';
}

export function isPreEndedSessionState(state: SessionLifecycleState): boolean {
  return state === 'SCHEDULED' || state === 'WAITING' || state === 'STARTING';
}

export const JOINABLE_SESSION_STATUSES: readonly SessionLifecycleState[] = ['WAITING', 'STARTING', 'LIVE'];

export function isJoinableSessionStatus(status: string): boolean {
  return JOINABLE_SESSION_STATUSES.includes(status as SessionLifecycleState);
}
