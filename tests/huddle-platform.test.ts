import { describe, expect, it } from 'vitest';
import {
  huddleAccess,
  joinDisplayName,
  memberJoinName,
  nextHuddleSlug,
  publicLiveRooms,
  scheduleFromMeetingTime,
} from '../shared/huddle.ts';

describe('huddle rooms', () => {
  it('stops a prayer leader from starting a huddle for another group', () => {
    expect(huddleAccess({
      orgRole: 'PRAYER_LEADER',
      actorUserId: 'user_leader',
      leaderUserId: 'user_someone_else',
    })).toBe('deny');
    expect(huddleAccess({
      orgRole: 'PRAYER_LEADER',
      actorUserId: 'user_leader',
      leaderUserId: 'user_leader',
    })).toBe('allow');
    expect(huddleAccess({
      orgRole: 'MEDIA',
      actorUserId: 'user_media',
      leaderUserId: 'user_media',
    })).toBe('deny');
    expect(huddleAccess({
      orgRole: 'OWNER',
      actorUserId: 'user_owner',
      leaderUserId: null,
    })).toBe('unlinked');
  });

  it('names the room from the group and keeps the slug unique', () => {
    expect(nextHuddleSlug([], 'Youth')).toBe('youth-huddle');
    expect(nextHuddleSlug(['youth-huddle'], 'Youth')).toBe('youth-huddle-2');
    expect(nextHuddleSlug(['youth-huddle', 'youth-huddle-2'], 'Youth')).toBe('youth-huddle-3');
    const schedule = scheduleFromMeetingTime('Wednesdays · 6:00 p.m.');
    expect(schedule.selectedDays).toEqual(['Wednesday']);
    expect(schedule.scheduledStart).toBe('06:00 PM');
    expect(schedule.isRecurring).toBe(true);
  });

  it('returns live rooms without personal data', () => {
    const rooms = publicLiveRooms([
      {
        name: 'Youth Huddle',
        slug: 'youth-huddle',
        kind: 'HUDDLE',
        groupName: 'Youth',
        listenerCount: 4,
        status: 'LIVE',
        guestName: 'Secret Person',
        email: 'secret@example.com',
        phone: '+256700000000',
        userId: 'user_secret',
        realtimeIdentity: 'guest_secret',
        firstName: 'Secret',
        lastName: 'Person',
      },
      {
        name: 'Closed room',
        slug: 'closed',
        status: 'ENDED',
        listenerCount: 1,
      },
    ]);
    const encoded = JSON.stringify(rooms);
    expect(rooms).toEqual([
      {
        name: 'Youth Huddle',
        slug: 'youth-huddle',
        kind: 'HUDDLE',
        groupName: 'Youth',
        listenerCount: 4,
        status: 'LIVE',
      },
    ]);
    expect(encoded).not.toContain('Secret');
    expect(encoded).not.toContain('secret@');
    expect(encoded).not.toContain('guest_secret');
    expect(encoded).not.toContain('user_secret');
  });

  it('uses the member first and last name when they are signed in', () => {
    expect(memberJoinName({ firstName: 'Grace', lastName: 'Love' })).toBe('Grace Love');
    expect(joinDisplayName({
      signedIn: true,
      memberName: 'Pastor GraceLove Hiire',
      typedName: 'Guest',
    })).toBe('Pastor GraceLove Hiire');
    expect(joinDisplayName({
      signedIn: false,
      memberName: 'Pastor GraceLove Hiire',
      typedName: 'Amina',
    })).toBe('Amina');
  });
});
