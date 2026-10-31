import { WEEKDAYS } from '../../shared/prayerRoom.ts';
import { PrayerRoom, PrayerSession } from '../types';

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function parseClockTime(timeStr: string): { hours: number; minutes: number } {
  let hours = 5;
  let minutes = 0;
  const match = (timeStr || '05:00 AM').match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (match) {
    let hour = parseInt(match[1], 10);
    minutes = parseInt(match[2], 10);
    const ampm = match[3]?.toUpperCase();
    if (ampm === 'PM' && hour < 12) hour += 12;
    if (ampm === 'AM' && hour === 12) hour = 0;
    hours = hour;
  }
  return { hours, minutes };
}

export function formatClockTime(hours: number, minutes: number): string {
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return `${pad(hour12)}:${pad(minutes)} ${ampm}`;
}

function ymdInZone(date: Date, timeZone: string): { year: number; month: number; day: number } {
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
  const [year, month, day] = formatted.split('-').map(Number);
  return { year, month, day };
}

function addCalendarDays(
  ymd: { year: number; month: number; day: number },
  days: number
): { year: number; month: number; day: number } {
  const utc = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + days));
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

/** Instant corresponding to a wall-clock time in `timeZone`. */
export function zonedWallTime(
  timeZone: string,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number
): Date {
  const asUtc = Date.UTC(year, month - 1, day, hour, minute, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(asUtc));
  const read = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value || 0);
  const asZoneUtc = Date.UTC(
    read('year'),
    read('month') - 1,
    read('day'),
    read('hour') % 24,
    read('minute'),
    read('second')
  );
  return new Date(asUtc - (asZoneUtc - asUtc));
}

const GRACE_MS = 2 * 60 * 60 * 1000;

/**
 * Calculates the next occurrences for a prayer room over the next 7 to 14 days.
 * Uses the room timezone so a Kampala 6:30 PM start is not rolled to tomorrow
 * just because the visitor's laptop is already past 6:30 PM locally.
 */
export function getNextOccurrences(room: PrayerRoom, count: number = 7, now: Date = new Date()): Date[] {
  const occurrences: Date[] = [];
  const timeZone = room.timezone || 'Africa/Kampala';
  const { hours: targetHours, minutes: targetMinutes } = parseClockTime(room.scheduledStart || '05:00 AM');

  if (!room.isRecurring) {
    if (!room.oneTimeDate || !/^\d{4}-\d{2}-\d{2}$/.test(room.oneTimeDate)) return [];
    const [year, month, day] = room.oneTimeDate.split('-').map(Number);
    const candidate = zonedWallTime(timeZone, year, month, day, targetHours, targetMinutes);
    if (candidate.getTime() + GRACE_MS > now.getTime()) return [candidate];
    return [];
  }

  const storedDays = (Array.isArray(room.selectedDays) ? room.selectedDays : []).filter((day) =>
    WEEKDAYS.includes(day as (typeof WEEKDAYS)[number])
  );
  const selectedDays =
    storedDays.length > 0 ? storedDays : room.recurrenceRule === 'DAILY' ? [...WEEKDAYS] : ['Sunday'];

  let cursor = ymdInZone(now, timeZone);
  for (let i = 0; i < 30 && occurrences.length < count; i++) {
    const candidate = zonedWallTime(
      timeZone,
      cursor.year,
      cursor.month,
      cursor.day,
      targetHours,
      targetMinutes
    );
    const weekday = new Intl.DateTimeFormat('en-US', { timeZone, weekday: 'long' }).format(candidate);
    const isDayMatched = room.recurrenceRule === 'DAILY' || selectedDays.includes(weekday);

    if (isDayMatched && candidate.getTime() + GRACE_MS > now.getTime()) {
      occurrences.push(candidate);
    }

    cursor = addCalendarDays(cursor, 1);
  }

  return occurrences;
}

const START_NOW_MS = 2 * 60 * 1000;

/** True when the next gathering is this minute, not a future scheduled slot. */
export function roomStartsNow(room: PrayerRoom, now: Date = new Date()): boolean {
  const next = getNextOccurrences(room, 1, now)[0];
  if (!next) return false;
  return Math.abs(next.getTime() - now.getTime()) <= START_NOW_MS;
}

/**
 * Formats a scheduled date in relation to current time (e.g. "Today • 05:00 AM", "Tomorrow • 05:00 AM", "Friday • 10:00 PM")
 */
export function formatScheduledDisplay(scheduledDateOrTime: string | Date, timezone?: string): string {
  let targetDate: Date;
  if (typeof scheduledDateOrTime === 'string') {
    if (scheduledDateOrTime.includes('T') || scheduledDateOrTime.includes('-')) {
      targetDate = new Date(scheduledDateOrTime);
    } else {
      // Just a time string like "05:00 AM"
      return scheduledDateOrTime;
    }
  } else {
    targetDate = scheduledDateOrTime;
  }

  if (isNaN(targetDate.getTime())) {
    return String(scheduledDateOrTime);
  }

  const now = new Date();
  const zone = timezone || undefined;
  const targetYmd = zone ? ymdInZone(targetDate, zone) : null;
  const nowYmd = zone ? ymdInZone(now, zone) : null;
  const tomorrowYmd = nowYmd ? addCalendarDays(nowYmd, 1) : null;
  const isToday = targetYmd && nowYmd
    ? targetYmd.year === nowYmd.year && targetYmd.month === nowYmd.month && targetYmd.day === nowYmd.day
    : targetDate.getDate() === now.getDate() &&
      targetDate.getMonth() === now.getMonth() &&
      targetDate.getFullYear() === now.getFullYear();

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = targetYmd && tomorrowYmd
    ? targetYmd.year === tomorrowYmd.year &&
      targetYmd.month === tomorrowYmd.month &&
      targetYmd.day === tomorrowYmd.day
    : targetDate.getDate() === tomorrow.getDate() &&
      targetDate.getMonth() === tomorrow.getMonth() &&
      targetDate.getFullYear() === tomorrow.getFullYear();

  const timeFormatted = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: timezone || undefined,
  }).format(targetDate);

  if (isToday) {
    return `Today • ${timeFormatted}`;
  }
  if (isTomorrow) {
    return `Tomorrow • ${timeFormatted}`;
  }

  const dayOfWeek = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: timezone || undefined,
  }).format(targetDate);

  const monthDay = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: timezone || undefined,
  }).format(targetDate);

  return `${dayOfWeek}, ${monthDay} • ${timeFormatted}`;
}

/**
 * Generates rolling scheduled sessions for rooms for the next 7 days if none exist.
 */
export function generateRollingSessions(rooms: PrayerRoom[], existingSessions: PrayerSession[]): PrayerSession[] {
  const newSessions: PrayerSession[] = [...existingSessions];

  rooms.forEach((room) => {
    // Check if room already has future scheduled sessions
    const hasScheduled = existingSessions.some(
      (s) => s.prayerRoomId === room.id && (s.status === 'SCHEDULED' || s.status === 'WAITING' || s.status === 'LIVE')
    );

    if (!hasScheduled) {
      const occurrences = getNextOccurrences(room, 3);
      occurrences.forEach((occ, idx) => {
        const id = `session_${room.slug}_${occ.getTime()}`;
        const alreadyExists = newSessions.some((s) => s.id === id);
        if (!alreadyExists) {
          newSessions.push({
            id,
            prayerRoomId: room.id,
            roomName: room.name,
            organizationName: '',
            status: idx === 0 && room.status === 'LIVE' ? 'LIVE' : 'SCHEDULED',
            scheduledStartTime: occ.toISOString(),
            durationSeconds: 0,
            totalUniqueParticipants: 0,
            peakConcurrentParticipants: 0,
            totalParticipants: 0,
            peakParticipants: 0,
            listenersWaitingCount: 0,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }
  });

  return newSessions;
}
