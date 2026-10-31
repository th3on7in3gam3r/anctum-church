import { PrayerRoom, PrayerSession, SessionLifecycleStatus } from '../types';
import { getNextOccurrences, formatScheduledDisplay } from './sessionScheduler';

export interface AltarLinkResolution {
  room: PrayerRoom | null;
  activeSession: PrayerSession | null;
  waitingSession: PrayerSession | null;
  nextScheduledSession: PrayerSession | null;
  latestEndedSession: PrayerSession | null;
  status: 'LIVE' | 'WAITING' | 'SCHEDULED' | 'ENDED' | 'NOT_FOUND';
  resolvedStatus: 'LIVE' | 'WAITING' | 'SCHEDULED' | 'ENDED' | 'NOT_FOUND';
  displayScheduleText: string;
  nextOccurrenceDate?: Date;
  nextScheduledDate?: Date;
  attendeeCount: number;
}

/**
 * Resolves an Altar Link slug or Room object to its current truthful session state.
 * Priority: LIVE > WAITING > SCHEDULED > ENDED > NOT_FOUND
 */
export function resolveAltarLink(
  slugOrRoom: string | PrayerRoom,
  roomsOrLiveSession?: PrayerRoom[] | PrayerSession | null,
  sessionsOrHistory?: PrayerSession[],
  currentLiveSession?: PrayerSession | null
): AltarLinkResolution {
  let targetRoom: PrayerRoom | null = null;
  let allSessions: PrayerSession[] = [];
  let liveSession: PrayerSession | null = null;

  if (typeof slugOrRoom === 'object' && slugOrRoom !== null && 'slug' in slugOrRoom) {
    targetRoom = slugOrRoom;
    liveSession = (roomsOrLiveSession as PrayerSession | null) || null;
    allSessions = (sessionsOrHistory as PrayerSession[]) || [];
  } else {
    const slugStr = typeof slugOrRoom === 'string' ? slugOrRoom.toLowerCase().trim() : '';
    const rooms = Array.isArray(roomsOrLiveSession) ? roomsOrLiveSession : [];
    targetRoom = rooms.find((r) => r.slug.toLowerCase() === slugStr || r.id === slugStr) || null;
    allSessions = Array.isArray(sessionsOrHistory) ? sessionsOrHistory : [];
    liveSession = currentLiveSession || null;
  }

  if (!targetRoom) {
    return {
      room: null,
      activeSession: null,
      waitingSession: null,
      nextScheduledSession: null,
      latestEndedSession: null,
      status: 'NOT_FOUND',
      resolvedStatus: 'NOT_FOUND',
      displayScheduleText: 'Room not found',
      attendeeCount: 0,
    };
  }

  // Find all sessions for this room
  const roomSessions = allSessions.filter((s) => s.prayerRoomId === targetRoom!.id);

  // 1. LIVE Session check (highest priority)
  const activeSession =
    (liveSession && liveSession.prayerRoomId === targetRoom.id && (liveSession.status === 'LIVE' || liveSession.status === 'STARTING')
      ? liveSession
      : null) ||
    roomSessions.find((s) => s.status === 'LIVE' || s.status === 'STARTING') ||
    null;

  if (activeSession) {
    return {
      room: targetRoom,
      activeSession,
      waitingSession: null,
      nextScheduledSession: null,
      latestEndedSession: null,
      status: 'LIVE',
      resolvedStatus: 'LIVE',
      displayScheduleText: 'In progress',
      attendeeCount: activeSession.totalUniqueParticipants || activeSession.totalParticipants || 0,
    };
  }

  // 2. WAITING Session check (Sanctuary is Open)
  const waitingSession =
    (liveSession && liveSession.prayerRoomId === targetRoom.id && liveSession.status === 'WAITING'
      ? liveSession
      : null) ||
    roomSessions.find((s) => s.status === 'WAITING') ||
    null;

  if (waitingSession) {
    return {
      room: targetRoom,
      activeSession: null,
      waitingSession,
      nextScheduledSession: null,
      latestEndedSession: null,
      status: 'WAITING',
      resolvedStatus: 'WAITING',
      displayScheduleText: `Prayer begins shortly • ${targetRoom.scheduledStart}`,
      attendeeCount: waitingSession.listenersWaitingCount || 0,
    };
  }

  // 3. Check for recently ended session
  const endedSessions = roomSessions
    .filter((s) => s.status === 'ENDED' || s.status === 'COMPLETED')
    .sort((a, b) => {
      const timeA = new Date(a.endedAt || a.startedAt || 0).getTime();
      const timeB = new Date(b.endedAt || b.startedAt || 0).getTime();
      return timeB - timeA;
    });

  const latestEnded = endedSessions[0] || null;
  const isRecentlyEnded =
    latestEnded &&
    latestEnded.endedAt &&
    Date.now() - new Date(latestEnded.endedAt).getTime() < 4 * 60 * 60 * 1000;

  // 4. Next scheduled occurrences
  const scheduledSessions = roomSessions
    .filter((s) => s.status === 'SCHEDULED' && s.scheduledStartTime)
    .sort((a, b) => new Date(a.scheduledStartTime!).getTime() - new Date(b.scheduledStartTime!).getTime());

  const nextScheduled = scheduledSessions[0] || null;
  const nextOccurrences = getNextOccurrences(targetRoom, 1);
  const nextOccDate = nextScheduled?.scheduledStartTime
    ? new Date(nextScheduled.scheduledStartTime)
    : nextOccurrences[0];

  const scheduleDisplayText = formatScheduledDisplay(nextOccDate || targetRoom.scheduledStart, targetRoom.timezone);

  if (isRecentlyEnded && latestEnded) {
    return {
      room: targetRoom,
      activeSession: null,
      waitingSession: null,
      nextScheduledSession: nextScheduled,
      latestEndedSession: latestEnded,
      status: 'ENDED',
      resolvedStatus: 'ENDED',
      displayScheduleText: `Next Gathering: ${scheduleDisplayText}`,
      nextOccurrenceDate: nextOccDate,
      nextScheduledDate: nextOccDate,
      attendeeCount: latestEnded.totalUniqueParticipants || latestEnded.totalParticipants || 0,
    };
  }

  // 5. Default to SCHEDULED
  return {
    room: targetRoom,
    activeSession: null,
    waitingSession: null,
    nextScheduledSession: nextScheduled,
    latestEndedSession: latestEnded,
    status: 'SCHEDULED',
    resolvedStatus: 'SCHEDULED',
    displayScheduleText: scheduleDisplayText,
    nextOccurrenceDate: nextOccDate,
    nextScheduledDate: nextOccDate,
    attendeeCount: targetRoom.expectedAttendance,
  };
}
