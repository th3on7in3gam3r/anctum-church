import { RealtimeUnavailable } from '../../shared/errors.ts';
import { isLiveKitConfigured } from '../env.ts';
import type { PrayerSessionRecord } from '../repositories/index.ts';
import { sessionRepository } from '../repositories/index.ts';
import { getLiveKitProvider, liveKitRoomNameForSession } from './livekitProvider.ts';

export async function ensureLiveKitRoom(session: PrayerSessionRecord): Promise<PrayerSessionRecord> {
  if (!isLiveKitConfigured()) {
    throw RealtimeUnavailable();
  }

  const roomName = session.livekitRoomName || liveKitRoomNameForSession(session.id);
  await getLiveKitProvider().ensureRoom(roomName);

  if (session.livekitRoomName === roomName) return session;
  return sessionRepository.update(session.id, { livekitRoomName: roomName });
}

export async function broadcastSessionEvent(
  roomName: string | null | undefined,
  type: string,
  extra?: Record<string, unknown>
): Promise<void> {
  if (!isLiveKitConfigured() || !roomName) return;
  try {
    await getLiveKitProvider().sendData(roomName, {
      type,
      timestamp: new Date().toISOString(),
      ...extra,
    });
  } catch {
    /* Delivery is best-effort; REST remains source of truth. */
  }
}
