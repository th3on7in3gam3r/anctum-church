const STAFF_CONTROL_ROLES = new Set(['OWNER', 'ADMIN', 'PRAYER_LEADER']);

/** Whether a signed-in staff session may open this room's control room. */
export function canControlRoom(input: {
  orgRole: string | null | undefined;
  actorUserId: string | null | undefined;
  roomKind?: string | null;
  groupLeaderUserId?: string | null;
}): boolean {
  if (!input.actorUserId || !input.orgRole) return false;
  if (input.orgRole === 'MEDIA') return false;
  if (STAFF_CONTROL_ROLES.has(input.orgRole)) return true;
  return (
    input.roomKind === 'HUDDLE' &&
    Boolean(input.groupLeaderUserId) &&
    input.groupLeaderUserId === input.actorUserId
  );
}
