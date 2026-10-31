import { describe, expect, it } from 'vitest';
import {
  formatGatheringTime,
  joinScheduleLabel,
  resolveSermonLeader,
  visibleOrganizationName,
} from '../shared/joinDisplay.ts';
import { mapServerSession } from '../src/services/domain/sessionSnapshot.ts';

describe('join card display', () => {
  it('hides the church line when it repeats the room name', () => {
    expect(visibleOrganizationName('Promised Land Christian Center', ' promised land christian center ')).toBe('');
    expect(visibleOrganizationName('Wednesday prayer', 'Promised Land Christian Center')).toBe('Promised Land Christian Center');
    expect(visibleOrganizationName('Wednesday prayer', '  ')).toBe('');
  });

  it('uses the church default speaker when the session has no leader', () => {
    expect(resolveSermonLeader('  ', 'Pastor GraceLove Hiire')).toBe('Pastor GraceLove Hiire');
    expect(resolveSermonLeader('Pastor Grace', 'Pastor GraceLove Hiire')).toBe('Pastor Grace');
    expect(resolveSermonLeader(null, null)).toBe('');
    expect(resolveSermonLeader('', 'Elder Ruth', 'Pastor GraceLove Hiire')).toBe('Elder Ruth');
    expect(resolveSermonLeader('  ', '  ', 'Pastor GraceLove Hiire')).toBe('Pastor GraceLove Hiire');
    expect(resolveSermonLeader('Pastor Grace', 'Elder Ruth', 'Pastor GraceLove Hiire')).toBe('Pastor Grace');
  });

  it('says Open now for a waiting or live gathering and otherwise formats the next time', () => {
    const wednesdayEvening = new Date('2026-10-14T15:00:00.000Z');
    expect(joinScheduleLabel('WAITING', wednesdayEvening, 'Africa/Kampala')).toBe('Open now');
    expect(joinScheduleLabel('LIVE', wednesdayEvening, 'Africa/Kampala')).toBe('Open now');
    expect(joinScheduleLabel('SCHEDULED', wednesdayEvening, 'Africa/Kampala')).toBe(
      formatGatheringTime(wednesdayEvening, 'Africa/Kampala')
    );
    expect(formatGatheringTime(wednesdayEvening, 'Africa/Kampala')).toBe('Wednesday · 6:00 p.m.');
    expect(joinScheduleLabel('SCHEDULED', undefined, 'Africa/Kampala')).toBe('');
  });

  it('leaves the organization name blank when the snapshot has none', () => {
    const session = mapServerSession(
      { id: 'session_1', status: 'WAITING', sermonLeaderName: '' },
      {
        id: 'room_1',
        organizationId: 'org_1',
        name: 'Promised Land Christian Center',
        slug: 'promised-land-christian-center',
        roomType: 'AUDIO_PRAYER',
        expectedAttendance: 0,
        speakerPermission: 'ADMIN_APPROVAL_REQUIRED',
        isRecurring: true,
        scheduledStart: '06:00 PM',
        timezone: 'Africa/Kampala',
        recordingEnabled: false,
        status: 'SCHEDULED',
        permanentUrl: '/join/promised-land-christian-center',
        createdAt: '2026-10-14T00:00:00.000Z',
        updatedAt: '2026-10-14T00:00:00.000Z',
      }
    );
    expect(session.organizationName).toBe('');
    expect(session.organizationName).not.toContain('Miracle');
  });
});
