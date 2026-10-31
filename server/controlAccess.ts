import type { Request } from 'express';
import { canControlRoom } from '../shared/controlAccess.ts';
import { resolveActorFromRequest } from './clerkAuth.ts';
import { getPrisma } from './prisma.ts';

export async function canControlForRequest(
  req: Request,
  room: { organizationId: string; kind?: string | null; groupId?: string | null }
): Promise<boolean> {
  const actor = await resolveActorFromRequest(req, room.organizationId);
  let groupLeaderUserId: string | null = null;
  if (room.kind === 'HUDDLE' && room.groupId) {
    const prisma = getPrisma();
    if (prisma) {
      const group = await prisma.group.findUnique({
        where: { id: room.groupId },
        select: { leader: { select: { userId: true } } },
      });
      groupLeaderUserId = group?.leader?.userId ?? null;
    }
  }
  return canControlRoom({
    orgRole: actor.orgRole,
    actorUserId: actor.userId,
    roomKind: room.kind,
    groupLeaderUserId,
  });
}
