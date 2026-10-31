import type { Request, Response } from 'express';
import { Unauthorized } from '../../shared/errors.ts';
import { sendError } from '../http.ts';
import { resolveActorFromRequest, resolvePrismaUserFromClerk } from '../clerkAuth.ts';
import { membershipRepository, organizationRepository, userRepository } from '../repositories/index.ts';
import { getPrisma } from '../prisma.ts';
import { memberJoinName } from '../../shared/huddle.ts';

export async function meHandler(req: Request, res: Response): Promise<void> {
  try {
    const prismaUser = await resolvePrismaUserFromClerk(req);
    if (!prismaUser) {
      throw Unauthorized('Sign in to continue.');
    }
    await membershipRepository.activateInvitedForUser(prismaUser.id);
    const actor = await resolveActorFromRequest(req);
    if (!actor.orgRole || !actor.organizationId) {
      res.json({
        needsOnboarding: true,
        user: {
          id: prismaUser.id,
          name: prismaUser.name,
          email: prismaUser.email,
          role: null,
          organizationId: null,
        },
        organization: null,
        memberships: [],
      });
      return;
    }

    const organization = await organizationRepository.findById(actor.organizationId);
    const user = await userRepository.findById(prismaUser.id);
    const memberships = await membershipRepository.listActiveByUser(prismaUser.id);
    const member = await getPrisma()?.member.findFirst({
      where: { organizationId: actor.organizationId, userId: prismaUser.id },
      select: { firstName: true, lastName: true },
    });
    const memberName = memberJoinName(member);

    res.json({
      needsOnboarding: false,
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
        role: actor.orgRole,
        organizationId: actor.organizationId,
        memberName: memberName || null,
      },
      organization,
      memberships,
      access: actor.access ?? null,
      features: actor.features ?? null,
    });
  } catch (error) {
    sendError(res, error);
  }
}
