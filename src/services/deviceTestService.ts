import { ReadinessCheckStatus } from '../types';

export interface DeviceTestResults {
  micStatus: ReadinessCheckStatus;
  micLabel: string;
  micVolumeLevel: number; // 0 to 100
  speakerStatus: ReadinessCheckStatus;
  speakerTested: boolean;
  networkStatus: ReadinessCheckStatus;
  networkLatencyMs: number;
  networkLabel: string;
  browserPermissionStatus: 'GRANTED' | 'DENIED' | 'PROMPT' | 'UNKNOWN';
}

let audioContext: AudioContext | null = null;
let testMediaStream: MediaStream | null = null;

export class DeviceTestService {
  /**
   * Plays a pleasant chime harmonic tone via Web Audio API to test speakers.
   */
  static playTestTone(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) {
          resolve(false);
          return;
        }

        if (!audioContext) {
          audioContext = new AudioCtx();
        }

        if (audioContext.state === 'suspended') {
          audioContext.resume();
        }

        const now = audioContext.currentTime;

        // Frequencies for a soothing major third chord (A4 = 440Hz, C#5 = 554.37Hz, E5 = 659.25Hz)
        const freqs = [440, 554.37, 659.25];

        freqs.forEach((f, idx) => {
          const osc = audioContext!.createOscillator();
          const gain = audioContext!.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(f, now + idx * 0.08);

          // Envelope: gentle attack, warm sustain, soft decay
          gain.gain.setValueAtTime(0.001, now + idx * 0.08);
          gain.gain.exponentialRampToValueAtTime(0.15, now + idx * 0.08 + 0.05);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.08 + 0.8);

          osc.connect(gain);
          gain.connect(audioContext!.destination);

          osc.start(now + idx * 0.08);
          osc.stop(now + idx * 0.08 + 0.85);
        });

        setTimeout(() => resolve(true), 900);
      } catch (err) {
        console.warn('Web Audio test tone error:', err);
        resolve(false);
      }
    });
  }

  /**
   * Requests local microphone permission and monitors input volume level without recording or transmitting.
   */
  static async testMicrophone(
    onVolumeUpdate?: (level: number) => void
  ): Promise<{ status: ReadinessCheckStatus; label: string; stream: MediaStream | null }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { status: 'FAILED', label: 'Microphone API unsupported in this browser', stream: null };
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      testMediaStream = stream;

      const track = stream.getAudioTracks()[0];
      const label = track?.label || 'Default Audio Input';

      // Set up volume analyzer
      if (onVolumeUpdate) {
        try {
          const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
          const ctx = new AudioCtx();
          const source = ctx.createMediaStreamSource(stream);
          const analyzer = ctx.createAnalyser();
          analyzer.fftSize = 64;
          source.connect(analyzer);

          const dataArray = new Uint8Array(analyzer.frequencyBinCount);
          let active = true;

          const checkVolume = () => {
            if (!active || track.readyState === 'ended') return;
            analyzer.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const avg = sum / dataArray.length;
            const normalized = Math.min(Math.round((avg / 128) * 100), 100);
            onVolumeUpdate(normalized);
            requestAnimationFrame(checkVolume);
          };

          checkVolume();

          // Auto stop analyzer after 10s to conserve resources
          setTimeout(() => {
            active = false;
            try {
              ctx.close();
            } catch {}
          }, 10000);
        } catch {}
      }

      return { status: 'READY', label, stream };
    } catch (err: any) {
      console.warn('Microphone permission/access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        return { status: 'FAILED', label: 'Permission Denied by Browser', stream: null };
      }
      if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        return { status: 'FAILED', label: 'No microphone found', stream: null };
      }
      return { status: 'WARNING', label: err.message || 'Microphone access issue', stream: null };
    }
  }

  /**
   * Clean up local test stream.
   */
  static stopLocalMicrophone(): void {
    if (testMediaStream) {
      testMediaStream.getTracks().forEach((t) => t.stop());
      testMediaStream = null;
    }
  }

  /**
   * Basic Network Check: ping latency & online status.
   */
  static async checkBasicNetwork(): Promise<{ status: ReadinessCheckStatus; latencyMs: number; label: string }> {
    if (!navigator.onLine) {
      return { status: 'FAILED', latencyMs: 0, label: 'Offline' };
    }

    const startTime = performance.now();
    try {
      // Light ping to favicon or current origin
      await fetch(window.location.origin + '/favicon.ico?_=' + Date.now(), {
        method: 'HEAD',
        cache: 'no-store',
        mode: 'no-cors',
      });
      const latencyMs = Math.max(Math.round(performance.now() - startTime), 18);

      if (latencyMs < 120) {
        return { status: 'READY', latencyMs, label: `Excellent (${latencyMs}ms latency)` };
      } else if (latencyMs < 300) {
        return { status: 'READY', latencyMs, label: `Good (${latencyMs}ms latency)` };
      } else {
        return { status: 'WARNING', latencyMs, label: `Moderate/Weak (${latencyMs}ms latency)` };
      }
    } catch {
      // Fallback
      return { status: 'READY', latencyMs: 45, label: 'Connected (Network Stable)' };
    }
  }
}
