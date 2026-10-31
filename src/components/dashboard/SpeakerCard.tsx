import React from 'react';
import { Participant } from '../../types';
import { Mic, MicOff, Volume2, UserCheck } from 'lucide-react';
import { formatTime } from '../../lib/utils';
import { RoleBadge } from '../common/RoleBadge';

interface SpeakerCardProps {
  speaker: Participant;
  onMute: (id: string) => void;
  onEndSpeaker: (id: string) => void;
}

export const SpeakerCard: React.FC<SpeakerCardProps> = ({
  speaker,
  onMute,
  onEndSpeaker,
}) => {
  return (
    <div className="p-5 rounded-2xl bg-white dark:bg-[#17221D] border-2 border-[#C9A35A]/50 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Left: Speaker Identity & Time */}
      <div className="flex items-center gap-3.5">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#203C32] to-[#16251F] text-[#C9A35A] flex items-center justify-center font-bold text-base shadow-xs">
            {speaker.displayName.substring(0, 2).toUpperCase()}
          </div>
          <div className="absolute -bottom-1 -right-1 p-1 rounded-full bg-emerald-600 text-white shadow-xs">
            {speaker.isMuted ? <MicOff className="w-3 h-3 text-red-200" /> : <Mic className="w-3 h-3" />}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-bold text-base text-[#16251F] dark:text-[#F8F7F3]">
              {speaker.displayName}
            </h4>
            <RoleBadge role={speaker.role} size="sm" />
          </div>

          <div className="flex items-center gap-2 mt-1 text-xs text-[#68736D] dark:text-[#96A39D]">
            <span className="flex items-center gap-1 font-mono font-semibold text-[#203C32] dark:text-[#E8D8B2]">
              <Volume2 className="w-3 h-3 text-emerald-600" />
              Speaker Preview {formatTime(speaker.speakingTimeSeconds || 0)}
            </span>
            {speaker.country && <span>• {speaker.country}</span>}
          </div>
        </div>
      </div>

      {/* Right: Moderation Controls */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={() => onMute(speaker.id)}
          type="button"
          className="px-3.5 py-2 rounded-xl text-xs font-semibold border border-[#E5E6E1] dark:border-[#26362F] hover:bg-amber-500/10 text-amber-800 dark:text-amber-300 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <MicOff className="w-3.5 h-3.5" />
          <span>{speaker.isMuted ? 'Unmute' : 'Mute'}</span>
        </button>

        <button
          onClick={() => onEndSpeaker(speaker.id)}
          type="button"
          className="px-3.5 py-2 rounded-xl text-xs font-bold bg-[#B94A48]/10 hover:bg-[#B94A48]/20 text-[#B94A48] dark:text-red-400 transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>End Speaker</span>
        </button>
      </div>
    </div>
  );
};
