import React from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface InvitedSpeakerBannerProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  canAccept?: boolean;
}

export const InvitedSpeakerBanner: React.FC<InvitedSpeakerBannerProps> = ({
  isOpen,
  onAccept,
  onDecline,
  canAccept = true,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="speaker-invite-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in zoom-in-95 duration-200"
    >
      <div
        className="sanctum-surface w-full max-w-md rounded-3xl p-6 text-center shadow-[var(--shadow-sanctum)] sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sanctum-chip mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl">
          <Mic className="h-8 w-8" />
        </div>

        <div className="sanctum-chip mb-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider">
          <Sparkles className="h-3.5 w-3.5" />
          Prayer Leader Invitation
        </div>

        <h2 id="speaker-invite-title" className="font-display text-4xl font-light tracking-tight">
          You're invited to pray
        </h2>

        <p className="sanctum-muted mt-2 text-sm leading-relaxed">
          A prayer leader would like you to speak and lead the congregation in prayer now.
        </p>

        <div className="sanctum-raised my-5 rounded-2xl p-3.5 text-xs">
          {canAccept
            ? 'When you tap Accept, your microphone will be enabled to lead in prayer.'
            : 'The prayer session has not started yet. The host must tap Start Prayer before you can speak.'}
        </div>

        <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button
            onClick={onDecline}
            type="button"
            className="sanctum-outline w-full cursor-pointer rounded-xl px-4 py-3 text-sm font-semibold sm:w-1/2"
          >
            Not Now
          </button>
          <button
            onClick={onAccept}
            type="button"
            disabled={!canAccept}
            className="sanctum-accent w-full cursor-pointer rounded-xl px-4 py-3 text-sm font-bold disabled:cursor-not-allowed sm:w-1/2"
          >
            {canAccept ? 'Accept & Pray' : 'Waiting for Start'}
          </button>
        </div>
      </div>
    </div>
  );
};
