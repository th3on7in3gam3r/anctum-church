import type { RemoteParticipant, RemoteTrack, Room } from 'livekit-client';
import type { ConnectionQuality, ConnectionState, Role } from '../../types';
import type { IRealtimeProvider, RealtimeEventListener, RealtimeEventPayload } from './types';

type LiveKitModule = typeof import('livekit-client');

let liveKitModule: Promise<LiveKitModule> | null = null;

function loadLiveKit(): Promise<LiveKitModule> {
  liveKitModule ??= import('livekit-client');
  return liveKitModule;
}

export interface LiveKitJoinParams {
  roomSlug: string;
  displayName: string;
  role: Role;
  token?: string;
  livekitUrl?: string;
  audioOnly?: boolean;
}

function mapConnectionState(kit: LiveKitModule, state: string): ConnectionState {
  const states = kit.ConnectionState;
  switch (state) {
    case states.Connecting:
      return 'CONNECTING';
    case states.Connected:
      return 'CONNECTED';
    case states.Reconnecting:
    case states.SignalReconnecting:
      return 'RECONNECTING';
    case states.Disconnected:
      return 'DISCONNECTED';
    default:
      return 'FAILED';
  }
}

/**
 * Client LiveKit provider. Tokens are minted only by the Express API.
 * Never import livekit-server-sdk from this file. Audio-only.
 */
export class LiveKitRealtimeProvider implements IRealtimeProvider {
  readonly isDevelopment = false;
  private room: Room | null = null;
  private listeners = new Set<RealtimeEventListener>();
  private audioElements = new Map<string, HTMLAudioElement>();
  private sessionId = '';
  private kit: LiveKitModule | null = null;
  connectionState: ConnectionState = 'DISCONNECTED';
  audioBlocked = false;
  connectedCount = 0;

  async joinRoom(params: LiveKitJoinParams): Promise<{
    sessionId: string;
    participantId: string;
    connectionQuality: ConnectionQuality;
  }> {
    if (!params.token || !params.livekitUrl) {
      throw new Error('LiveKit connection unavailable in this environment.');
    }

    await this.leaveRoom(this.sessionId, '');
    const kit = await loadLiveKit();
    this.kit = kit;
    this.sessionId = params.roomSlug;
    this.room = new kit.Room({
      adaptiveStream: true,
      dynacast: true,
      publishDefaults: {
        videoCodec: undefined,
      },
    });

    this.bindRoomEvents(this.room);
    this.connectionState = 'CONNECTING';
    this.emit({
      type: 'CONNECTED',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
      metadata: { connectionState: 'CONNECTING' },
    });

    await this.room.connect(params.livekitUrl, params.token, { autoSubscribe: true });
    if (params.audioOnly !== false) {
      try {
        await this.room.localParticipant.setCameraEnabled(false);
      } catch {
        /* Audio-only rooms do not publish a camera. */
      }
    }
    this.connectedCount = this.room.remoteParticipants.size + 1;
    await this.tryStartAudio();
    this.attachExistingRemoteAudio();

    return {
      sessionId: this.sessionId,
      participantId: this.room.localParticipant.identity,
      connectionQuality: 'GOOD',
    };
  }

  async tryStartAudio(): Promise<boolean> {
    if (!this.room) return false;
    try {
      await this.room.startAudio();
      this.audioBlocked = false;
      return true;
    } catch {
      this.audioBlocked = true;
      return false;
    }
  }

  async enableMicrophone(): Promise<void> {
    if (!this.room) throw new Error('Not connected to prayer.');
    await this.room.localParticipant.setMicrophoneEnabled(true);
  }

  async disableMicrophone(): Promise<void> {
    if (!this.room) return;
    await this.room.localParticipant.setMicrophoneEnabled(false);
  }

  /** Restrict who can hear this tab's mic to a single peer (private sideline). */
  async beginPrivatePrayer(peerIdentity: string): Promise<void> {
    if (!this.room) throw new Error('Not connected to prayer.');
    this.room.localParticipant.setTrackSubscriptionPermissions(false, [
      { participantIdentity: peerIdentity, allowAll: true },
    ]);
    await this.room.localParticipant.setMicrophoneEnabled(true);
    this.emitMicStateChanged();
  }

  /** Restore room-wide subscription so everyone can hear this tab again. */
  async endPrivatePrayer(): Promise<void> {
    if (!this.room) return;
    this.room.localParticipant.setTrackSubscriptionPermissions(true);
    await this.room.localParticipant.setMicrophoneEnabled(false);
    this.emitMicStateChanged();
  }

  async setPttActive(active: boolean): Promise<void> {
    if (!this.room) throw new Error('Not connected to prayer.');
    await this.room.localParticipant.setMicrophoneEnabled(active);
    this.emitMicStateChanged();
  }

  async leaveRoom(_sessionId: string, _participantId: string): Promise<void> {
    this.teardownMicAnalyser();
    this.audioElements.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    this.audioElements.clear();
    if (this.room) {
      try {
        this.room.localParticipant.setTrackSubscriptionPermissions(true);
      } catch {
        /* disconnecting */
      }
      this.room.removeAllListeners();
      await this.room.disconnect();
    }
    this.room = null;
    this.connectionState = 'DISCONNECTED';
  }

  getIdentity(): string | null {
    return this.room?.localParticipant.identity ?? null;
  }

  /** identity -> true when that person currently has an unmuted microphone. */
  getMicStates(): Record<string, boolean> {
    const states: Record<string, boolean> = {};
    if (!this.room || !this.kit) return states;
    const microphone = this.kit.Track.Source.Microphone;
    const collect = (identity: string, publication: { isMuted: boolean; track?: unknown } | undefined) => {
      states[identity] = Boolean(publication && !publication.isMuted && publication.track);
    };
    collect(
      this.room.localParticipant.identity,
      this.room.localParticipant.getTrackPublication(microphone)
    );
    this.room.remoteParticipants.forEach((participant) => {
      collect(participant.identity, participant.getTrackPublication(microphone));
    });
    return states;
  }

  /**
   * Local mic health for UI: whether this browser tab is publishing,
   * and a 0–1 input level so you can see which tab is “live”.
   */
  getLocalMicStatus(): { publishing: boolean; muted: boolean; level: number; connected: boolean } {
    if (!this.room || this.connectionState !== 'CONNECTED') {
      return { publishing: false, muted: true, level: 0, connected: false };
    }
    const publication = this.kit
      ? this.room.localParticipant.getTrackPublication(this.kit.Track.Source.Microphone)
      : undefined;
    const mediaTrack = publication?.track?.mediaStreamTrack;
    const publishing = Boolean(publication?.track);
    const muted = !publishing || Boolean(publication?.isMuted) || Boolean(mediaTrack?.muted);
    let level = 0;
    if (publishing && !muted && mediaTrack) {
      level = this.sampleMicLevel(mediaTrack);
    }
    return { publishing, muted, level, connected: true };
  }

  private micAnalyser: {
    trackId: string;
    context: AudioContext;
    analyser: AnalyserNode;
    source: MediaStreamAudioSourceNode;
    data: Uint8Array;
  } | null = null;

  private sampleMicLevel(track: MediaStreamTrack): number {
    try {
      if (!this.micAnalyser || this.micAnalyser.trackId !== track.id) {
        this.teardownMicAnalyser();
        const context = new AudioContext();
        const source = context.createMediaStreamSource(new MediaStream([track]));
        const analyser = context.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.7;
        source.connect(analyser);
        this.micAnalyser = {
          trackId: track.id,
          context,
          analyser,
          source,
          data: new Uint8Array(analyser.frequencyBinCount),
        };
        void context.resume();
      }
      const { analyser, data } = this.micAnalyser;
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      return Math.min(1, rms * 4);
    } catch {
      return 0;
    }
  }

  private teardownMicAnalyser(): void {
    if (!this.micAnalyser) return;
    try {
      this.micAnalyser.source.disconnect();
      void this.micAnalyser.context.close();
    } catch {
      /* already closed */
    }
    this.micAnalyser = null;
  }

  private emitMicStateChanged(): void {
    this.emit({
      type: 'MIC_STATE_CHANGED',
      sessionId: this.sessionId,
      timestamp: new Date().toISOString(),
    });
  }

  async raiseHand(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/raise-hand');
  }
  async lowerHand(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/lower-hand');
  }
  async sendReaction(): Promise<void> {
    /* Reactions stay toast-only until chat/data events are used. */
  }

  async sendChatMessage(sessionId: string, displayName: string, body: string): Promise<void> {
    if (!this.room) {
      throw new Error('Not connected to prayer.');
    }
    const payload = {
      type: 'CHAT_MESSAGE' as const,
      sessionId: sessionId || this.sessionId,
      displayName,
      timestamp: new Date().toISOString(),
      metadata: { body },
    };
    const bytes = new TextEncoder().encode(JSON.stringify(payload));
    await this.room.localParticipant.publishData(bytes, { reliable: true });
    this.emit(payload);
  }
  async acceptSpeakerInvitation(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/speaker/accept');
  }
  async finishSpeaking(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/speaker/revoke');
  }
  async inviteSpeaker(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/speaker/invite');
  }
  async muteParticipant(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/participants/:id/mute');
  }
  async removeParticipant(): Promise<void> {
    throw new Error('Use POST /api/sessions/:id/participants/:id/remove');
  }
  async updateParticipantRole(): Promise<void> {
    throw new Error('Session roles are assigned by the server');
  }
  async endSession(): Promise<void> {
    throw new Error('Use POST /api/prayer-sessions/:id/end');
  }

  subscribe(callback: RealtimeEventListener): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private bindRoomEvents(room: Room): void {
    const kit = this.kit;
    if (!kit) return;
    const { RoomEvent, Track } = kit;
    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      this.connectionState = mapConnectionState(kit, state);
      const type =
        this.connectionState === 'DISCONNECTED' || this.connectionState === 'FAILED'
          ? 'DISCONNECTED'
          : 'CONNECTED';
      this.emit({
        type,
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata: { connectionState: this.connectionState },
      });
    });

    room.on(RoomEvent.TrackSubscribed, (track, _publication, participant) => {
      if (track.kind !== Track.Kind.Audio) {
        track.stop();
        return;
      }
      this.attachAudio(track, participant.identity);
      void this.tryStartAudio();
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _publication, participant) => {
      if (track.kind === Track.Kind.Audio) {
        this.detachAudio(participant.identity);
      }
    });

    room.on(RoomEvent.ParticipantConnected, (participant) => {
      this.connectedCount = room.remoteParticipants.size + 1;
      this.attachParticipantAudio(participant);
      this.emit({
        type: 'PARTICIPANT_JOINED',
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata: { connectedNow: this.connectedCount },
      });
    });

    room.on(RoomEvent.ParticipantDisconnected, () => {
      this.connectedCount = room.remoteParticipants.size + 1;
      this.emit({
        type: 'PARTICIPANT_LEFT',
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata: { connectedNow: this.connectedCount },
      });
    });

    room.on(RoomEvent.DataReceived, (payload) => {
      try {
        const parsed = JSON.parse(new TextDecoder().decode(payload)) as RealtimeEventPayload & {
          type: string;
        };
        this.emit({
          ...parsed,
          sessionId: parsed.sessionId || this.sessionId,
          timestamp: parsed.timestamp || new Date().toISOString(),
        });
      } catch {
        /* ignore malformed data packets */
      }
    });

    room.on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const speaker = speakers[0];
      if (!speaker) return;
      this.emit({
        type: 'ACTIVE_SPEAKER_CHANGED',
        sessionId: this.sessionId,
        displayName: speaker.name || '',
        timestamp: new Date().toISOString(),
      });
    });

    const onMicChanged = () => this.emitMicStateChanged();
    room.on(RoomEvent.TrackMuted, onMicChanged);
    room.on(RoomEvent.TrackUnmuted, onMicChanged);
    room.on(RoomEvent.TrackPublished, onMicChanged);
    room.on(RoomEvent.TrackUnpublished, onMicChanged);
    room.on(RoomEvent.LocalTrackPublished, onMicChanged);
    room.on(RoomEvent.LocalTrackUnpublished, onMicChanged);
  }

  private attachExistingRemoteAudio(): void {
    if (!this.room) return;
    this.room.remoteParticipants.forEach((participant) => {
      this.attachParticipantAudio(participant);
    });
  }

  private attachParticipantAudio(participant: RemoteParticipant): void {
    const Track = this.kit?.Track;
    if (!Track) return;
    const mic = participant.getTrackPublication(Track.Source.Microphone);
    if (mic?.track && mic.isSubscribed && mic.track.kind === Track.Kind.Audio) {
      this.attachAudio(mic.track, participant.identity);
      return;
    }
    participant.trackPublications.forEach((publication) => {
      if (publication.kind !== Track.Kind.Audio || !publication.track || !publication.isSubscribed) return;
      this.attachAudio(publication.track, participant.identity);
    });
  }

  private attachAudio(track: RemoteTrack, identity: string): void {
    this.detachAudio(identity);
    const el = track.attach();
    el.autoplay = true;
    el.setAttribute('playsinline', 'true');
    el.volume = 1;
    el.muted = false;
    el.style.display = 'none';
    document.body.appendChild(el);
    this.audioElements.set(identity, el);
    void el.play().catch(() => {
      this.audioBlocked = true;
      this.emit({
        type: 'CONNECTED',
        sessionId: this.sessionId,
        timestamp: new Date().toISOString(),
        metadata: { connectionState: this.connectionState, audioBlocked: true },
      });
    });
  }

  private detachAudio(identity: string): void {
    const el = this.audioElements.get(identity);
    if (el) {
      el.srcObject = null;
      el.remove();
      this.audioElements.delete(identity);
    }
  }

  private emit(event: RealtimeEventPayload): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event);
      } catch (err) {
        console.error('[Sanctum LiveKit] listener error', err);
      }
    });
  }
}

export const livekitRealtimeProvider = new LiveKitRealtimeProvider();
