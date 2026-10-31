import type { Request, Response } from 'express';
import { WebhookReceiver } from 'livekit-server-sdk';
import { Unauthorized } from '../../shared/errors.ts';
import { env, isLiveKitConfigured } from '../env.ts';
import { sendError } from '../http.ts';
import { getLiveKitProvider } from '../realtime/livekitProvider.ts';
import { participantRepository, sessionRepository, webhookEventRepository } from '../repositories/index.ts';

export function requireWebhookSignature(authHeader: string | undefined | null): void {
  if (!authHeader) {
    throw Unauthorized('Unsigned webhook payload rejected');
  }
}

function receiver(): WebhookReceiver {
  if (!isLiveKitConfigured()) {
    throw Unauthorized('LiveKit webhooks are not configured');
  }
  return new WebhookReceiver(env.livekitApiKey!, env.livekitApiSecret!);
}

export async function livekitWebhookHandler(req: Request, res: Response): Promise<void> {
  try {
    if (!isLiveKitConfigured()) {
      res.status(503).json({ error: 'REALTIME_UNAVAILABLE', message: 'LiveKit is not configured' });
      return;
    }

    const authHeader = req.get('Authorization') || req.get('authorization') || '';
    requireWebhookSignature(authHeader);

    const rawBody = Buffer.isBuffer(req.body)
      ? req.body.toString('utf8')
      : typeof req.body === 'string'
        ? req.body
        : JSON.stringify(req.body ?? {});

    const event = await receiver().receive(rawBody, authHeader);
    const eventId = event.id || `${event.event}-${event.createdAt}-${event.participant?.identity || ''}-${event.room?.name || ''}`;
    const isNew = await webhookEventRepository.recordIfNew(
      eventId,
      event.event,
      event.room?.name ?? null,
      event as unknown as Record<string, unknown>
    );
    if (!isNew) {
      res.json({ ok: true, duplicate: true });
      return;
    }

    const roomName = event.room?.name;
    if (roomName) {
      const session = await sessionRepository.findByLiveKitRoomName(roomName);
      if (session) {
        const live = await getLiveKitProvider().listParticipants(roomName);
        await sessionRepository.bumpPeakConcurrent(session.id, live.length);

        const identity = event.participant?.identity;
        if (identity && (event.event === 'participant_left' || event.event === 'participant_connection_aborted')) {
          const participant = await participantRepository.findByRealtimeIdentity(session.id, identity);
          if (participant && !participant.leftAt) {
            await participantRepository.markLeft(participant.id);
          }
        }
        if (identity && event.event === 'participant_joined') {
          const participant = await participantRepository.findByRealtimeIdentity(session.id, identity);
          if (participant?.leftAt) {
            await participantRepository.markRejoined(participant.id);
          }
        }
      }
    }

    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}
