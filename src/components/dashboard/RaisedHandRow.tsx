import React from 'react';
import { RaisedHand } from '../../types';
import { formatTime } from '../../lib/utils';
import { Hand, Mic, X, Clock } from 'lucide-react';

interface RaisedHandRowProps {
  hand: RaisedHand;
  onInviteToPray: (participantId: string) => void;
  onDismiss: (handId: string) => void;
  canInvite?: boolean;
}

export const RaisedHandRow: React.FC<RaisedHandRowProps> = ({
  hand,
  onInviteToPray,
  onDismiss,
  canInvite = true,
}) => {
  const isInvited = hand.status === 'INVITED';
  return (
    <div className="p-3.5 rounded-2xl bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F] hover:border-[#C9A35A]/50 transition-all space-y-3 shadow-xs">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-[#C9A35A]/15 text-[#C9A35A] flex items-center justify-center font-bold text-sm shrink-0">
          <Hand className="w-5 h-5 text-[#203C32] dark:text-[#C9A35A]" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="font-bold text-sm text-[#16251F] dark:text-[#F8F7F3] truncate">{hand.displayName}</h4>
            <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500/10 text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              {isInvited ? 'Invited' : 'Waiting'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#68736D] dark:text-[#96A39D] mt-1">
            <span className="inline-flex items-center gap-1 font-mono text-amber-700 dark:text-amber-400 font-semibold">
              <Clock className="w-3 h-3" />
              {isInvited ? 'Awaiting acceptance' : `Waiting ${formatTime(hand.waitingSeconds)}`}
            </span>
            {hand.country && <span>• {hand.country}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => onDismiss(hand.id)}
          type="button"
          aria-label={`Dismiss ${hand.displayName}'s raised hand`}
          className="p-2 rounded-xl text-gray-400 hover:text-[#B94A48] hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          title="Dismiss raised hand"
        >
          <X className="w-4 h-4" />
        </button>

        <button
          onClick={() => onInviteToPray(hand.participantId)}
          type="button"
          disabled={!canInvite || isInvited}
          className="px-4 py-2 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Mic className="w-3.5 h-3.5" />
          <span>{isInvited ? 'Invitation sent' : canInvite ? 'Invite to Pray' : 'Start Prayer first'}</span>
        </button>
      </div>
    </div>
  );
};
