import { AccessToken, TrackSource, type VideoGrant } from 'livekit-server-sdk';
import { RealtimeUnavailable } from '../../shared/errors.ts';
import { env, isLiveKitConfigured } from '../env.ts';
import { buildLiveKitTokenGrants } from '../../shared/livekitGrants.ts';
import type { OrganizationRole, SessionRole } from '../../shared/roles.ts';

export interface MintTokenInput {
  roomName: string;
  identity: string;
  name: string;
  sessionRole: SessionRole;
  holdsSpeakerFloor: boolean;
  congregationMuted?: boolean;
  speakerPermission?: string;
  orgRole?: OrganizationRole | null;
  ttlSeconds?: number;
}

export async function mintLiveKitAccessToken(input: MintTokenInput): Promise<string> {
  if (!isLiveKitConfigured()) {
    throw RealtimeUnavailable();
  }

  const grants = buildLiveKitTokenGrants({
    roomName: input.roomName,
    sessionRole: input.sessionRole,
    holdsSpeakerFloor: input.holdsSpeakerFloor,
    congregationMuted: input.congregationMuted,
    speakerPermission: input.speakerPermission,
    orgRole: input.orgRole,
  });

  const token = new AccessToken(env.livekitApiKey!, env.livekitApiSecret!, {
    identity: input.identity,
    name: input.name,
    ttl: input.ttlSeconds ?? 60 * 60 * 6,
  });

  const videoGrant: VideoGrant = {
    roomJoin: grants.roomJoin,
    room: grants.room,
    canPublish: grants.canPublish,
    canSubscribe: grants.canSubscribe,
    canPublishData: true,
    roomAdmin: grants.roomAdmin,
  };
  if (grants.canPublishSources.includes('microphone')) {
    videoGrant.canPublishSources = [TrackSource.MICROPHONE];
  }

  token.addGrant(videoGrant);
  return token.toJwt();
}
