import React from 'react';
import { Show, SignInButton, UserButton } from '@clerk/react';
import { useAuth } from '../../context/AuthContext';

const clerkAppearance = {
  variables: {
    colorPrimary: '#203C32',
    borderRadius: '0.75rem',
  },
} as const;

const navButtonClass = 'min-h-11 cursor-pointer px-2 text-sm text-ink';

interface ClerkNavAuthProps {
  onNavigate: (path: string) => void;
}

export const ClerkNavAuth: React.FC<ClerkNavAuthProps> = ({ onNavigate }) => {
  const { clerkConfigured, isAuthenticated } = useAuth();

  if (!clerkConfigured) {
    return (
      <button
        onClick={() => onNavigate('/login')}
        className={`${navButtonClass} hover:text-green dark:hover:text-gold`}
      >
        Church Login
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <Show when="signed-out">
        <SignInButton mode="modal" forceRedirectUrl="/onboarding" appearance={clerkAppearance}>
          <button
            type="button"
            className={`${navButtonClass} hover:text-green dark:hover:text-gold`}
          >
            Sign in
          </button>
        </SignInButton>
      </Show>
      <Show when="signed-in">
        {isAuthenticated ? (
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            className={`${navButtonClass} hover:text-green dark:hover:text-gold`}
          >
            Sanctum Space
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onNavigate('/onboarding')}
            className={`${navButtonClass} hover:text-green dark:hover:text-gold`}
          >
            Create space
          </button>
        )}
        <UserButton afterSignOutUrl="/" appearance={clerkAppearance} />
      </Show>
    </div>
  );
};
