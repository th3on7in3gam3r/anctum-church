import type { Request, Response } from 'express';
import { clerkClient } from '@clerk/express';
import { isInviteableOrgRole } from '../../shared/roles.ts';
import { Unauthorized } from '../../shared/errors.ts';
import { requireCanManageTeam } from '../authz.ts';
import { resolveActorFromRequest } from '../clerkAuth.ts';
import { env, isClerkConfigured } from '../env.ts';
import { sendError } from '../http.ts';
import { membershipRepository, userRepository } from '../repositories/index.ts';

export async function listTeamHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanManageTeam(actor);
    if (!actor.organizationId) throw Unauthorized();

    const members = await membershipRepository.listByOrganization(actor.organizationId);
    res.json({
      members: members.map((row) => ({
        userId: row.userId,
        name: row.user.name,
        email: row.user.email,
        role: row.role,
        status: row.status,
        canPublishGallery: row.canPublishGallery,
      })),
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function inviteTeamMemberHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    if (!actor.organizationId || !actor.userId) throw Unauthorized();

    const rawEmail = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const phone = typeof req.body?.phone === 'string' ? req.body.phone.replace(/[^\d]/g, '') : '';
    const email = rawEmail || (phone ? `media.${phone}@media.plcc.local` : '');
    const role = typeof req.body?.role === 'string' ? req.body.role.trim() : '';
    if (!email || !email.includes('@')) {
      res.status(400).json({ error: 'INVALID_INVITE', message: 'A staff email or phone number is required.' });
      return;
    }
    if (actor.orgRole !== 'OWNER' && !(actor.orgRole === 'ADMIN' && role === 'MEDIA')) {
      throw Unauthorized('Church staff are invited by the Owner.');
    }
    if (!isInviteableOrgRole(role)) {
      res.status(400).json({
        error: 'INVALID_INVITE',
        message: 'Invite an Admin, or a Media teammate for the gallery.',
      });
      return;
    }

    let user = await userRepository.findByEmail(email);
    if (!user) {
      user = await userRepository.create({
        name: phone && !rawEmail ? phone : email.split('@')[0],
        email,
      });
    }

    const existing = await membershipRepository.find(actor.organizationId, user.id);
    if (existing?.status === 'ACTIVE') {
      res.status(409).json({
        error: 'ALREADY_MEMBER',
        message: 'That email is already on this church team.',
      });
      return;
    }

    const membership = await membershipRepository.upsertInvite({
      organizationId: actor.organizationId,
      userId: user.id,
      role,
    });

    let clerkInviteSent = false;
    if (isClerkConfigured()) {
      try {
        await clerkClient.invitations.createInvitation({
          emailAddress: email,
          redirectUrl: `${env.appUrl}/login`,
        });
        clerkInviteSent = true;
      } catch {
        clerkInviteSent = false;
      }
    }

    res.status(existing ? 200 : 201).json({
      member: {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        status: membership.status,
      },
      clerkInviteSent,
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateGalleryPublishHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    if (actor.orgRole !== 'OWNER' && actor.orgRole !== 'ADMIN') {
      throw Unauthorized('Only an Owner or Admin can change gallery publishing.');
    }
    if (!actor.organizationId) throw Unauthorized();
    const userId = String(req.params.userId || '').trim();
    const membership = await membershipRepository.find(actor.organizationId, userId);
    if (!membership || membership.role !== 'MEDIA') {
      res.status(404).json({ error: 'MEMBER_NOT_FOUND', message: 'Choose a media teammate.' });
      return;
    }
    const { getPrisma } = await import('../prisma.ts');
    const client = getPrisma();
    if (!client) throw Unauthorized('Database is not configured.');
    const updated = await client.organizationMembership.update({
      where: { organizationId_userId: { organizationId: actor.organizationId, userId } },
      data: { canPublishGallery: Boolean(req.body?.canPublishGallery) },
    });
    res.json({ userId, canPublishGallery: updated.canPublishGallery });
  } catch (error) {
    sendError(res, error);
  }
}

export async function removeTeamMemberHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanManageTeam(actor);
    if (!actor.organizationId) throw Unauthorized();

    const userId = String(req.params.userId || '').trim();
    if (!userId) {
      res.status(400).json({ error: 'INVALID_MEMBER', message: 'A team member is required.' });
      return;
    }

    const membership = await membershipRepository.find(actor.organizationId, userId);
    if (!membership) {
      res.status(404).json({ error: 'MEMBER_NOT_FOUND', message: 'That person is not on this church team.' });
      return;
    }
    if (membership.role === 'OWNER') {
      res.status(403).json({
        error: 'CANNOT_REMOVE_OWNER',
        message: 'The Owner cannot be removed from this Sanctum Space.',
      });
      return;
    }

    await membershipRepository.remove(actor.organizationId, userId);
    res.json({ ok: true, userId });
  } catch (error) {
    sendError(res, error);
  }
}
