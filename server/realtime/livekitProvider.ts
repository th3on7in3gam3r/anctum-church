import {
  DataPacket_Kind,
  RoomServiceClient,
  TrackSource,
  type CreateOptions,
} from 'livekit-server-sdk';
import { RealtimeUnavailable } from '../../shared/errors.ts';
import { env, isLiveKitConfigured } from '../env.ts';

export interface ILiveKitRealtimeProvider {
  createRoom(name: string): Promise<void>;
  ensureRoom(name: string): Promise<void>;
  deleteRoom(name: string): Promise<void>;
  removeParticipant(roomName: string, identity: string): Promise<void>;
  updatePublishPermission(roomName: string, identity: string, canPublish: boolean): Promise<void>;
  muteParticipant(roomName: string, identity: string): Promise<void>;
  unmuteParticipant(roomName: string, identity: string): Promise<void>;
  listParticipants(roomName: string): Promise<Array<{ identity: string; name?: string }>>;
  sendData(roomName: string, payload: Record<string, unknown>): Promise<void>;
}

function toHttpUrl(livekitUrl: string): string {
  return livekitUrl.replace(/^wss:/, 'https:').replace(/^ws:/, 'http:');
}

function requireClient(): RoomServiceClient {
  if (!isLiveKitConfigured()) {
    throw RealtimeUnavailable();
  }
  return new RoomServiceClient(toHttpUrl(env.livekitUrl!), env.livekitApiKey!, env.livekitApiSecret!);
}

export function isAlreadyExistsError(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('already exists') || message.includes('already_exists') || message.includes('duplicat');
}

export async function createRoomIdempotent(
  createRoom: (options: CreateOptions) => Promise<unknown>,
  options: CreateOptions
): Promise<void> {
  try {
    await createRoom(options);
  } catch (error) {
    if (!isAlreadyExistsError(error)) throw error;
  }
}

export function liveKitRoomNameForSession(sessionId: string): string {
  return `sanctum_${sessionId}`;
}

export class LiveKitRealtimeProvider implements ILiveKitRealtimeProvider {
  async createRoom(name: string): Promise<void> {
    await this.ensureRoom(name);
  }

  async ensureRoom(name: string): Promise<void> {
    const client = requireClient();
    const options: CreateOptions = {
      name,
      emptyTimeout: 60 * 60 * 6,
      maxParticipants: 10_000,
    };
    await createRoomIdempotent((opts) => client.createRoom(opts), options);
  }

  async deleteRoom(name: string): Promise<void> {
    const client = requireClient();
    try {
      await client.deleteRoom(name);
    } catch {
      /* Room may already be empty or deleted. */
    }
  }

  async removeParticipant(roomName: string, identity: string): Promise<void> {
    const client = requireClient();
    await client.removeParticipant(roomName, identity);
  }

  async updatePublishPermission(roomName: string, identity: string, canPublish: boolean): Promise<void> {
    const client = requireClient();
    await client.updateParticipant(roomName, identity, {
      permission: {
        canSubscribe: true,
        canPublish,
        canPublishData: true,
        ...(canPublish ? { canPublishSources: [TrackSource.MICROPHONE] } : {}),
      },
    });
  }

  async muteParticipant(roomName: string, identity: string): Promise<void> {
    await this.setTrackMuted(roomName, identity, true);
  }

  async unmuteParticipant(roomName: string, identity: string): Promise<void> {
    await this.setTrackMuted(roomName, identity, false);
  }

  private async setTrackMuted(roomName: string, identity: string, muted: boolean): Promise<void> {
    const client = requireClient();
    const participant = await client.getParticipant(roomName, identity);
    const tracks = participant.tracks ?? [];
    await Promise.all(
      tracks
        .filter((track) => track.sid && Boolean(track.muted) !== muted)
        .map((track) => client.mutePublishedTrack(roomName, identity, track.sid, muted))
    );
  }

  async listParticipants(roomName: string): Promise<Array<{ identity: string; name?: string }>> {
    const client = requireClient();
    try {
      const participants = await client.listParticipants(roomName);
      return participants.map((participant) => ({
        identity: participant.identity,
        name: participant.name,
      }));
    } catch {
      return [];
    }
  }

  async sendData(roomName: string, payload: Record<string, unknown>): Promise<void> {
    const client = requireClient();
    const data = new TextEncoder().encode(JSON.stringify(payload));
    await client.sendData(roomName, data, DataPacket_Kind.RELIABLE, {});
  }
}

export function getLiveKitProvider(): ILiveKitRealtimeProvider {
  return new LiveKitRealtimeProvider();
}
