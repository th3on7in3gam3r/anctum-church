import type { Request, Response } from 'express';
import { requireOrganization } from '../cms/access.ts';
import { resolveActorFromRequest } from '../clerkAuth.ts';
import { getClerkStatus, getLiveKitStatus } from '../env.ts';
import { DatabaseUnavailable } from '../../shared/errors.ts';
import { sendError } from '../http.ts';
import { getPrisma, pingDatabase } from '../prisma.ts';

export async function healthHandler(_req: Request, res: Response): Promise<void> {
  try {
    const database = await pingDatabase();
    const livekit = getLiveKitStatus();
    const clerk = getClerkStatus();
    res.json({
      ok: true,
      database,
      livekit,
      clerk,
      realtimeEngine: livekit === 'configured' ? 'configured' : 'not_configured',
    });
  } catch (error) {
    sendError(res, error);
  }
}

export async function databaseHealthHandler(req: Request, res: Response): Promise<void> {
  try {
    const actor = await resolveActorFromRequest(req);
    requireOrganization(actor);
    const prisma = getPrisma();
    if (!prisma) throw DatabaseUnavailable();
    await prisma.$queryRaw`SELECT 1`;
    const rows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    res.json({ ok: true, openConnections: Number(rows[0]?.count ?? 0) });
  } catch (error) {
    sendError(res, error);
  }
}
