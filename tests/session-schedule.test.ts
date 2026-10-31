import { describe, expect, it } from 'vitest';
import { formatClockTime, getNextOccurrences, parseClockTime, zonedWallTime } from '../src/services/sessionScheduler.ts';
import type { PrayerRoom } from '../src/types';

const room = (overrides: Partial<PrayerRoom> = {}): PrayerRoom => ({
  id: 'room_1',
  organizationId: 'org_1',
  name: 'Hadassah Room',
  slug: 'hadassah-room',
  roomType: 'AUDIO_PRAYER',
  expectedAttendance: 100,
  speakerPermission: 'ADMIN_APPROVAL_REQUIRED',
  isRecurring: true,
  recurrenceRule: 'DAILY',
  scheduledStart: '06:30 PM',
  timezone: 'Africa/Kampala',
  recordingEnabled: false,
  status: 'SCHEDULED',
  permanentUrl: '/join/hadassah-room',
  createdAt: '2026-08-20T00:00:00.000Z',
  updatedAt: '2026-08-20T00:00:00.000Z',
  ...overrides,
});

describe('parseClockTime', () => {
  it('parses 12-hour times', () => {
    expect(parseClockTime('06:29 PM')).toEqual({ hours: 18, minutes: 29 });
    expect(parseClockTime('05:00 AM')).toEqual({ hours: 5, minutes: 0 });
  });
});

describe('getNextOccurrences', () => {
  it('returns only the selected weekdays', () => {
    const occurrences = getNextOccurrences(
      room({
        timezone: 'UTC',
        isRecurring: true,
        recurrenceRule: 'SELECTED_DAYS',
        selectedDays: ['Monday', 'Wednesday'],
        scheduledStart: '09:00 AM',
      }),
      4
    );
    expect(occurrences.length).toBeGreaterThan(0);
    for (const occurrence of occurrences) {
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(occurrence);
      expect(['Monday', 'Wednesday']).toContain(weekday);
    }
  });

  it('uses the single weekly day', () => {
    const occurrences = getNextOccurrences(
      room({
        timezone: 'UTC',
        isRecurring: true,
        recurrenceRule: 'WEEKLY',
        selectedDays: ['Friday'],
        scheduledStart: '09:00 AM',
      }),
      3
    );
    expect(occurrences.length).toBeGreaterThan(0);
    for (const occurrence of occurrences) {
      const weekday = new Intl.DateTimeFormat('en-US', { timeZone: 'UTC', weekday: 'long' }).format(occurrence);
      expect(weekday).toBe('Friday');
    }
  });

  it('uses oneTimeDate for one-time rooms and does not roll forward', () => {
    const future = new Date();
    future.setUTCDate(future.getUTCDate() + 3);
    const oneTimeDate = future.toISOString().slice(0, 10);
    const occurrences = getNextOccurrences(
      room({
        isRecurring: false,
        oneTimeDate,
        timezone: 'UTC',
        scheduledStart: '09:00 AM',
        recurrenceRule: 'DAILY',
        selectedDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      }),
      5
    );
    expect(occurrences).toHaveLength(1);
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(occurrences[0]);
    expect(formatted).toBe(oneTimeDate);
  });

  it('keeps a start time that just passed within the grace window', () => {
    const now = new Date();
    const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const next = getNextOccurrences(
      room({
        timezone: tz,
        scheduledStart: formatClockTime(twoMinutesAgo.getHours(), twoMinutesAgo.getMinutes()),
      }),
      1
    )[0];
    expect(next).toBeDefined();
    expect(now.getTime() - next.getTime()).toBeGreaterThanOrEqual(0);
    expect(now.getTime() - next.getTime()).toBeLessThan(10 * 60 * 1000);
  });

  it('builds a Kampala wall clock instant', () => {
    const instant = zonedWallTime('Africa/Kampala', 2026, 8, 20, 18, 30);
    const hour = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Kampala',
        hour: 'numeric',
        hourCycle: 'h23',
      }).format(instant)
    );
    const minute = Number(
      new Intl.DateTimeFormat('en-US', {
        timeZone: 'Africa/Kampala',
        minute: '2-digit',
      }).format(instant)
    );
    expect(hour % 24).toBe(18);
    expect(minute).toBe(30);
  });
});
