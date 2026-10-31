import React, { useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { cn } from '../../lib/utils';
import { ConfirmDialog } from './ConfirmDialog';
import { useApp } from '../../context/AppContext';

interface BackButtonProps {
  /**
   * Destination path (e.g. '/dashboard/prayer-rooms')
   */
  to?: string;
  /**
   * Full descriptive label on desktop (e.g. 'Back to Prayer Rooms')
   */
  label?: string;
  /**
   * Short label on mobile (defaults to 'Back')
   */
  mobileLabel?: string;
  /**
   * Navigation handler function
   */
  onNavigate?: (path: string) => void;
  /**
   * Direct click override
   */
  onClick?: () => void;
  /**
   * Whether the current form has unsaved modifications
   */
  isDirty?: boolean;
  /**
   * Additional styling classes
   */
  className?: string;
  /**
   * Disabled state
   */
  disabled?: boolean;
}

const backButtonClassName = (
  disabled: boolean,
  className?: string
) =>
  cn(
    'group inline-flex items-center gap-2 py-2 px-3 sm:px-3.5 -ml-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer min-h-[44px] min-w-[44px]',
    'text-[#68736D] hover:text-[#16251F] dark:text-[#96A39D] dark:hover:text-[#F8F7F3]',
    'hover:bg-black/5 dark:hover:bg-white/5',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#203C32] dark:focus-visible:ring-[#C9A35A] focus-visible:ring-offset-2',
    'no-underline',
    disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
    className
  );

export const BackButton: React.FC<BackButtonProps> = ({
  to,
  label = 'Back',
  mobileLabel = 'Back',
  onNavigate,
  onClick,
  isDirty = false,
  className,
  disabled = false,
}) => {
  const [showUnsavedPrompt, setShowUnsavedPrompt] = useState(false);
  const { setHasUnsavedChanges } = useApp();

  const performNavigation = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to && onNavigate) {
      onNavigate(to);
      return;
    }
    if (to) {
      window.history.pushState({}, '', to);
      window.dispatchEvent(new PopStateEvent('popstate'));
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.history.back();
  };

  const requestNavigation = () => {
    if (disabled) return;
    if (isDirty) {
      setShowUnsavedPrompt(true);
      return;
    }
    performNavigation();
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    requestNavigation();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      requestNavigation();
    }
  };

  const inner = (
    <>
      <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-0.5 text-[#203C32] dark:text-[#C9A35A]" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">{mobileLabel}</span>
    </>
  );

  return (
    <>
      {to && !onClick ? (
        <a
          href={to}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          aria-label={label}
          aria-disabled={disabled || undefined}
          className={backButtonClassName(disabled, className)}
        >
          {inner}
        </a>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label={label}
          className={backButtonClassName(disabled, className)}
        >
          {inner}
        </button>
      )}

      {showUnsavedPrompt && (
        <ConfirmDialog
          isOpen={showUnsavedPrompt}
          title="Discard unsaved changes?"
          message="Your changes have not been saved."
          confirmText="Discard Changes"
          cancelText="Stay Here"
          isDestructive={true}
          onConfirm={() => {
            setShowUnsavedPrompt(false);
            setHasUnsavedChanges(false);
            performNavigation();
          }}
          onCancel={() => setShowUnsavedPrompt(false)}
        />
      )}
    </>
  );
};
