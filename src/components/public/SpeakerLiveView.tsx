import React from 'react';
import { Mic, MicOff, Volume2, CheckCircle } from 'lucide-react';
import { LiveBadge } from '../common/LiveBadge';
import { ParticipantCount } from '../common/ParticipantCount';

interface SpeakerLiveViewProps {
  participantName: string;
  participantCount?: number;
  onFinishPrayer: () => void;
  selfMuted?: boolean;
  onToggleSelfMute?: () => void;
}

export const SpeakerLiveView: React.FC<SpeakerLiveViewProps> = ({
  participantName,
  participantCount,
  onFinishPrayer,
  selfMuted = false,
  onToggleSelfMute,
}) => {
  return (
    <div className="sanctum-speaking mx-auto flex max-w-lg flex-col items-center justify-center rounded-3xl p-6 text-center sm:p-10">
      <div className="z-10 mb-4 flex items-center gap-3">
        <LiveBadge size="md" className="sanctum-chip" />
        <ParticipantCount count={participantCount} emptyLabel="Waiting for participants" className="sanctum-chip" />
      </div>

      <div className="relative z-10 my-6">
        <div className="sanctum-accent flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32">
          {selfMuted ? <MicOff className="h-14 w-14" /> : <Mic className="h-14 w-14" />}
        </div>
        <div className="sanctum-chip absolute -bottom-2 -right-2 rounded-full p-2">
          <Volume2 className="h-4 w-4" />
        </div>
      </div>

      <h2 className="font-display z-10 text-4xl font-light tracking-tight">
        You Are Praying Live
      </h2>
      <p className="z-10 mt-2 text-base font-medium">
        {participantName}, you are leading the congregation in prayer.
      </p>

      <p className="sanctum-muted z-10 mt-1 max-w-sm text-xs">
        Speak clearly into your device. The entire congregation is lifting their voices with you.
      </p>

      <div className="z-10 mt-8 w-full space-y-3">
        {onToggleSelfMute ? (
          <button
            onClick={onToggleSelfMute}
            type="button"
            className="sanctum-outline w-full cursor-pointer rounded-2xl px-6 py-3 text-sm font-semibold"
          >
            {selfMuted ? 'Unmute microphone' : 'Mute microphone'}
          </button>
        ) : null}
        <button
          onClick={onFinishPrayer}
          type="button"
          className="sanctum-accent flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-6 py-4 text-base font-bold"
        >
          <CheckCircle className="h-5 w-5" />
          Finish Prayer
        </button>
        <span className="sanctum-muted mt-2 block text-[11px]">
          Finish Prayer returns you to listener. Mute does not end your speaking turn.
        </span>
      </div>
    </div>
  );
};
