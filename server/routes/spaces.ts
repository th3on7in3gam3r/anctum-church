import type { Request, Response } from 'express';
import { DuplicateSlug, Unauthorized } from '../../shared/errors.ts';
import { slugify } from '../../shared/slug.ts';
import { requireCanManageOrganization } from '../authz.ts';
import { resolveActorFromRequest, resolvePrismaUserFromClerk } from '../clerkAuth.ts';
import { createSanctumSpace } from '../churchOwner.ts';
import { sendError } from '../http.ts';
import { organizationRepository } from '../repositories/index.ts';

export async function createSpaceHandler(req: Request, res: Response): Promise<void> {
  try {
    const prismaUser = await resolvePrismaUserFromClerk(req);
    if (!prismaUser) {
      throw Unauthorized('Sign in to create a Sanctum Space.');
    }

    const name = typeof req.body?.name === 'string' ? req.body.name.trim() : '';
    const requestedSlug = typeof req.body?.slug === 'string' ? req.body.slug.trim() : '';
    const logoUrl = typeof req.body?.logoUrl === 'string' ? req.body.logoUrl.trim() : '';
    const created = await createSanctumSpace({
      user: prismaUser,
      name,
      slug: requestedSlug || undefined,
      logoUrl: logoUrl || undefined,
    });

    res.status(201).json({
      organization: created.organization,
      user: {
        id: created.user.id,
        name: created.user.name,
        email: created.user.email,
        role: 'OWNER',
        organizationId: created.organization.id,
      },
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function updateCurrentSpaceHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanManageOrganization(actor);
    if (!actor.organizationId) throw Unauthorized();

    const current = await organizationRepository.findById(actor.organizationId);
    if (!current) throw Unauthorized('Sanctum Space not found.');

    const data: {
      name?: string;
      slug?: string;
      logoUrl?: string | null;
      country?: string;
      timezone?: string;
      website?: string | null;
      joinPageMessage?: string | null;
      accentColor?: string | null;
    } = {};

    if (typeof req.body?.name === 'string' && req.body.name.trim()) {
      data.name = req.body.name.trim();
    }
    if (typeof req.body?.slug === 'string') {
      const nextSlug = slugify(req.body.slug);
      if (nextSlug && nextSlug !== current.slug) {
        const taken = await organizationRepository.findBySlug(nextSlug);
        if (taken && taken.id !== current.id) throw DuplicateSlug(nextSlug);
        data.slug = nextSlug;
      }
    }
    if (typeof req.body?.logoUrl === 'string') {
      const nextLogo = req.body.logoUrl.trim();
      if (nextLogo) {
        let parsed: URL;
        try {
          parsed = new URL(nextLogo);
        } catch {
          throw Unauthorized('Logo must be a public http or https image URL.');
        }
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw Unauthorized('Logo must be a public http or https image URL.');
        }
        data.logoUrl = nextLogo;
      } else {
        data.logoUrl = null;
      }
    }
    if (typeof req.body?.country === 'string') data.country = req.body.country.trim();
    if (typeof req.body?.timezone === 'string') data.timezone = req.body.timezone.trim();
    if (typeof req.body?.website === 'string') data.website = req.body.website.trim() || null;
    if (typeof req.body?.joinPageMessage === 'string') {
      data.joinPageMessage = req.body.joinPageMessage.trim() || null;
    }
    if (typeof req.body?.accentColor === 'string') {
      data.accentColor = req.body.accentColor.trim() || null;
    }

    const organization = await organizationRepository.update(actor.organizationId, data);
    res.json({ organization });
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteCurrentSpaceHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireCanManageOrganization(actor);
    if (!actor.organizationId) throw Unauthorized();

    const current = await organizationRepository.findById(actor.organizationId);
    if (!current) throw Unauthorized('Sanctum Space not found.');

    const confirmName = typeof req.body?.confirmName === 'string' ? req.body.confirmName.trim() : '';
    if (!confirmName || confirmName.toLowerCase() !== current.name.trim().toLowerCase()) {
      throw Unauthorized('Type the exact church name to delete this Sanctum Space.');
    }

    await organizationRepository.deleteById(current.id);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}
