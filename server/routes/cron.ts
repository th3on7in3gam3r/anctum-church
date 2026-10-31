import { timingSafeEqual } from 'node:crypto';
import type { Request, Response } from 'express';
import { sendError } from '../http.ts';
import { importYoutubeChannels } from '../youtube/import.ts';

function secretMatches(header: string | undefined) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || !header) return false;
  const provided = Buffer.from(header);
  const wanted = Buffer.from(expected);
  if (provided.length !== wanted.length) return false;
  return timingSafeEqual(provided, wanted);
}

export async function youtubeImportCron(req: Request, res: Response) {
  try {
    const header = req.header('x-cron-secret') || '';
    if (!secretMatches(header)) {
      res.status(401).json({ error: 'UNAUTHORIZED', message: 'Cron secret is missing or incorrect.', details: null });
      return;
    }
    const result = await importYoutubeChannels();
    res.json({ ok: true, created: result.created });
  } catch (error) {
    sendError(res, error);
  }
}
