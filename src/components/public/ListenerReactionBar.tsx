import React from 'react';
import { Hand, FileText, Check } from 'lucide-react';
import { cn } from '../../lib/utils';

interface ListenerReactionBarProps {
  isHandRaised: boolean;
  onSendAmen: () => void;
  onSendPraiseGod: () => void;
  onToggleRaiseHand: () => void;
  onOpenPrayerRequest: () => void;
  showRaiseHand?: boolean;
  showPrayerRequest?: boolean;
  className?: string;
}

export const ListenerReactionBar: React.FC<ListenerReactionBarProps> = ({
  isHandRaised,
  onSendAmen,
  onSendPraiseGod,
  onToggleRaiseHand,
  onOpenPrayerRequest,
  showRaiseHand = true,
  showPrayerRequest = true,
  className,
}) => {
  return (
    <div className={cn('mx-auto flex w-full max-w-md flex-col gap-4', className)}>
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={onSendAmen}
          type="button"
          aria-label="Say Amen"
          className="sanctum-outline flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl active:scale-95"
        >
          <span className="text-2xl">🙏</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">Amen</span>
        </button>

        <button
          onClick={onSendPraiseGod}
          type="button"
          aria-label="Praise God"
          className="sanctum-outline flex h-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl active:scale-95"
        >
          <span className="text-2xl">❤️</span>
          <span className="text-[10px] font-semibold uppercase tracking-widest">Praise God</span>
        </button>
      </div>

      {(showRaiseHand || showPrayerRequest) && (
        <div className="flex gap-3 pt-2">
          {showRaiseHand && (
            <button
              onClick={onToggleRaiseHand}
              type="button"
              aria-pressed={isHandRaised}
              className={cn(
                'flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl py-4 text-sm font-bold tracking-wide active:scale-95',
                isHandRaised ? 'sanctum-accent' : 'sanctum-raise'
              )}
            >
              {isHandRaised ? (
                <>
                  <Check className="h-4 w-4" />
                  <span>Hand Raised</span>
                </>
              ) : (
                <>
                  <Hand className="h-4 w-4" />
                  <span>Raise Hand</span>
                </>
              )}
            </button>
          )}

          {showPrayerRequest && (
            <button
              onClick={onOpenPrayerRequest}
              type="button"
              className="sanctum-accent flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-full py-4 text-sm font-semibold tracking-wide"
            >
              <FileText className="h-4 w-4" />
              <span>Prayer Request</span>
            </button>
          )}
        </div>
      )}

      {showRaiseHand && isHandRaised && (
        <div className="sanctum-raised rounded-2xl p-3.5 text-center">
          <p className="text-xs font-semibold">Your hand is raised in the queue.</p>
          <p className="sanctum-muted mt-0.5 text-[11px]">
            A prayer leader will invite you when it's your turn to pray.
          </p>
          <button
            onClick={onToggleRaiseHand}
            type="button"
            className="sanctum-danger mt-2 cursor-pointer rounded-full px-3 py-1 text-xs font-semibold"
          >
            Lower Hand
          </button>
        </div>
      )}
    </div>
  );
};
