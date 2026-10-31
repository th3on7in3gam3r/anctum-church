import { describe, expect, it } from 'vitest';
import { canControlRoom } from '../shared/controlAccess.ts';

describe('control room access payload', () => {
  it('keeps canControl false for a guest and for MEDIA', () => {
    expect(canControlRoom({ orgRole: null, actorUserId: null })).toBe(false);
    expect(canControlRoom({ orgRole: null, actorUserId: 'guest_1' })).toBe(false);
    expect(canControlRoom({ orgRole: 'MEDIA', actorUserId: 'user_media' })).toBe(false);
    expect(
      canControlRoom({
        orgRole: 'MEDIA',
        actorUserId: 'user_media',
        roomKind: 'HUDDLE',
        groupLeaderUserId: 'user_media',
      })
    ).toBe(false);
  });

  it('sets canControl true for OWNER, ADMIN, and PRAYER_LEADER', () => {
    expect(canControlRoom({ orgRole: 'OWNER', actorUserId: 'user_owner' })).toBe(true);
    expect(canControlRoom({ orgRole: 'ADMIN', actorUserId: 'user_admin' })).toBe(true);
    expect(canControlRoom({ orgRole: 'PRAYER_LEADER', actorUserId: 'user_leader' })).toBe(true);
  });

  it('lets a huddle group leader open that huddle', () => {
    expect(
      canControlRoom({
        orgRole: 'TECHNICAL_ADMIN',
        actorUserId: 'user_leader',
        roomKind: 'HUDDLE',
        groupLeaderUserId: 'user_leader',
      })
    ).toBe(true);
    expect(
      canControlRoom({
        orgRole: 'TECHNICAL_ADMIN',
        actorUserId: 'user_other',
        roomKind: 'HUDDLE',
        groupLeaderUserId: 'user_leader',
      })
    ).toBe(false);
  });
});
