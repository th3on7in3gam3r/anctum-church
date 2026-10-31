import React from 'react';
import { Participant } from '../../types';
import { Mic, MicOff, Headphones } from 'lucide-react';
import { cn } from '../../lib/utils';

export type ActivityState = 'ACTIVE_SPEAKING' | 'IDLE_LISTENING' | 'AUDIO_MUTED';

interface RealtimeStatusIndicatorProps {
  participant: Participant;
  compact?: boolean;
  className?: string;
}

export const getParticipantActivityState = (participant: Participant): ActivityState => {
  if (participant.role === 'SPEAKER' || participant.role === 'PRAYER_LEADER' || participant.role === 'OWNER') {
    if (participant.isMuted) {
      return 'AUDIO_MUTED';
    }
    return 'ACTIVE_SPEAKING';
  }
  // Listeners are audio muted by default in Sanctum Live
  if (participant.isMuted !== false) {
    return 'AUDIO_MUTED';
  }
  return 'IDLE_LISTENING';
};

export const RealtimeStatusIndicator: React.FC<RealtimeStatusIndicatorProps> = ({
  participant,
  compact = false,
  className = '',
}) => {
  const activityState = getParticipantActivityState(participant);

  const getActivityConfig = () => {
    switch (activityState) {
      case 'ACTIVE_SPEAKING':
        return {
          label: 'Speaker Preview',
          shortLabel: 'Preview',
          badgeClass:
            'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300 font-bold',
          icon: Mic,
          pulse: false,
          showWave: false,
        };
      case 'AUDIO_MUTED':
        return {
          label: participant.role === 'LISTENER' ? 'Listener Policy: Locked' : 'Configured Speaker',
          shortLabel: participant.role === 'LISTENER' ? 'Locked' : 'Preview',
          badgeClass:
            'bg-amber-500/10 border-amber-500/20 text-amber-800 dark:text-amber-300/90 font-medium',
          icon: MicOff,
          pulse: false,
          showWave: false,
        };
      case 'IDLE_LISTENING':
      default:
        return {
          label: 'Listener Policy: Locked',
          shortLabel: 'Locked',
          badgeClass:
            'bg-slate-500/10 border-slate-500/20 text-slate-700 dark:text-slate-300 font-medium',
          icon: Headphones,
          pulse: false,
          showWave: false,
        };
    }
  };

  const config = getActivityConfig();
  const Icon = config.icon;

  if (compact) {
    return (
      <span
        title={config.label}
        className={cn(
          'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] border transition-all',
          config.badgeClass,
          className
        )}
      >
        <Icon className="w-3 h-3 shrink-0" />
        {config.showWave && (
          <span className="flex items-center gap-0.5 h-2">
            <span className="w-0.5 h-1.5 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
            <span className="w-0.5 h-2.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
            <span className="w-0.5 h-2 bg-current rounded-full animate-bounce" />
          </span>
        )}
        <span>{config.shortLabel}</span>
      </span>
    );
  }

  return (
    <div
      title={`Preview state: ${config.label}`}
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-xl text-xs border transition-all',
        config.badgeClass,
        className
      )}
    >
      <div className="relative flex items-center justify-center">
        <Icon className="w-3.5 h-3.5 shrink-0" />
        {config.pulse && (
          <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
        )}
      </div>

      {config.showWave && (
        <span className="flex items-center gap-0.5 h-3">
          <span className="w-0.5 h-2 bg-current rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-0.5 h-3.5 bg-current rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-0.5 h-2.5 bg-current rounded-full animate-bounce" />
        </span>
      )}

      <span>{config.label}</span>
    </div>
  );
};
