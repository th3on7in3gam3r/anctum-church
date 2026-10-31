import { ConnectionState as LiveKitConnectionState, Room, RoomEvent, Track, type RemoteTrack } from 'livekit-client';

export type PrayerAudioStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'disconnected';

type StatusListener = (status: PrayerAudioStatus) => void;

class PrayerAudio {
  private room: Room | null = null;
  private audio = new Map<string, HTMLAudioElement>();
  private listeners = new Set<StatusListener>();
  private muted = false;
  status: PrayerAudioStatus = 'idle';

  onStatus(listener: StatusListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async connect(livekitUrl: string, token: string): Promise<void> {
    await this.disconnect();
    this.setStatus('connecting');
    const room = new Room({ adaptiveStream: true, dynacast: true });
    this.room = room;

    room.on(RoomEvent.ConnectionStateChanged, (state) => {
      if (state === LiveKitConnectionState.Connected) this.setStatus('connected');
      else if (state === LiveKitConnectionState.Connecting) this.setStatus('connecting');
      else if (
        state === LiveKitConnectionState.Reconnecting ||
        state === LiveKitConnectionState.SignalReconnecting
      ) {
        this.setStatus('reconnecting');
      } else this.setStatus('disconnected');
    });

    room.on(RoomEvent.TrackSubscribed, (track, _pub, participant) => {
      if (track.kind !== Track.Kind.Audio) {
        track.stop();
        return;
      }
      this.attach(track, participant.identity);
    });

    room.on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => {
      if (track.kind === Track.Kind.Audio) this.detach(participant.identity);
    });

    await room.connect(livekitUrl, token, { autoSubscribe: true });
    try {
      await room.startAudio();
    } catch {
      /* click-to-join should already unlock audio */
    }
    this.setStatus('connected');
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.audio.forEach((el) => {
      el.muted = muted;
    });
  }

  isMuted(): boolean {
    return this.muted;
  }

  async disconnect(): Promise<void> {
    this.audio.forEach((el) => {
      el.srcObject = null;
      el.remove();
    });
    this.audio.clear();
    if (this.room) {
      this.room.removeAllListeners();
      await this.room.disconnect();
    }
    this.room = null;
    this.setStatus('idle');
  }

  private attach(track: RemoteTrack, identity: string): void {
    this.detach(identity);
    const el = track.attach();
    el.autoplay = true;
    el.setAttribute('playsinline', 'true');
    el.muted = this.muted;
    el.style.display = 'none';
    document.body.appendChild(el);
    this.audio.set(identity, el);
    void el.play().catch(() => undefined);
  }

  private detach(identity: string): void {
    const el = this.audio.get(identity);
    if (!el) return;
    el.srcObject = null;
    el.remove();
    this.audio.delete(identity);
  }

  private setStatus(status: PrayerAudioStatus): void {
    this.status = status;
    this.listeners.forEach((listener) => listener(status));
  }
}

export const prayerAudio = new PrayerAudio();
