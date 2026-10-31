import React from 'react';
import { Show, SignInButton } from '@clerk/react';
import { useAuth } from '../../context/AuthContext';

const clerkAppearance = {
  variables: {
    colorPrimary: '#203C32',
    borderRadius: '0.75rem',
  },
} as const;

const heroButtonClass =
  'inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-green px-5 text-sm font-medium text-paper hover:brightness-95 dark:bg-gold dark:text-paper sm:w-auto';

interface StartPrayerRoomCtaProps {
  onNavigate: (path: string) => void;
}

export const StartPrayerRoomCta: React.FC<StartPrayerRoomCtaProps> = ({ onNavigate }) => {
  const { clerkConfigured, isAuthenticated } = useAuth();

  if (!clerkConfigured) {
    return (
      <button type="button" onClick={() => onNavigate('/onboarding')} className={heroButtonClass}>
        Start a prayer room
      </button>
    );
  }

  return (
    <>
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/onboarding" appearance={clerkAppearance}>
          <button type="button" className={heroButtonClass}>
            Start a prayer room
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        <button
          type="button"
          onClick={() => onNavigate(isAuthenticated ? '/dashboard/prayer-rooms/new' : '/onboarding')}
          className={heroButtonClass}
        >
          Start a prayer room
        </button>
      </Show>
    </>
  );
};
