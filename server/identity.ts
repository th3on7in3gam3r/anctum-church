import { randomBytes } from 'node:crypto';

export type JoinConnectionKind = 'listener' | 'control';

export function createGuestRealtimeIdentity(): string {
  return `guest_${randomBytes(16).toString('hex')}`;
}

export function createMemberRealtimeIdentity(userId: string): string {
  return `user_${userId}`;
}

/** Separate LiveKit identity so Control Room and join page can both stay connected. */
export function createControlRealtimeIdentity(userId: string): string {
  return `user_${userId}_control`;
}

export function resolveJoinRealtimeIdentity(
  userId: string | null,
  clientSuppliedIdentity?: string,
  connectionKind: JoinConnectionKind = 'listener'
): string {
  if (!userId) {
    if (clientSuppliedIdentity && /^guest_[a-f0-9]{32}$/.test(clientSuppliedIdentity)) {
      return clientSuppliedIdentity;
    }
    return createGuestRealtimeIdentity();
  }
  if (connectionKind === 'control') return createControlRealtimeIdentity(userId);
  return createMemberRealtimeIdentity(userId);
}
