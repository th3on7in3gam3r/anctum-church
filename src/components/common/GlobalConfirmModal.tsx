import React, { useEffect, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { AlertTriangle, Trash2, Power, ShieldAlert, X, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

export const GlobalConfirmModal: React.FC = () => {
  const { confirmModalConfig, closeConfirmModal } = useApp();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!confirmModalConfig) return;
      if (e.key === 'Escape' && !isSubmitting) {
        closeConfirmModal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmModalConfig, closeConfirmModal, isSubmitting]);

  if (!confirmModalConfig) return null;

  const {
    title,
    description,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    isDestructive = false,
    onConfirm,
    onCancel,
  } = confirmModalConfig;

  const handleConfirm = async () => {
    try {
      setIsSubmitting(true);
      await Promise.resolve(onConfirm());
      closeConfirmModal();
    } catch (err) {
      console.error('Action failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    if (isSubmitting) return;
    if (onCancel) onCancel();
    closeConfirmModal();
  };

  const isEndingSession = title.toLowerCase().includes('end') || title.toLowerCase().includes('session');
  const isDeletingRoom = title.toLowerCase().includes('delete') || title.toLowerCase().includes('room');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="global-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-lg bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] transition-all transform animate-in zoom-in-95 duration-150 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Subtle accent bar at top */}
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1.5',
            isDestructive ? 'bg-[#B94A48] dark:bg-red-500' : 'bg-[#C9A35A]'
          )}
        />

        {/* Close Button */}
        <button
          onClick={handleCancel}
          disabled={isSubmitting}
          type="button"
          aria-label="Close dialog"
          className="absolute top-5 right-5 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4 sm:gap-5">
          {/* Icon Box */}
          <div
            className={cn(
              'w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-inner',
              isDestructive
                ? 'bg-red-500/10 dark:bg-red-500/20 text-[#B94A48] dark:text-red-400 border border-red-500/20'
                : 'bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] border border-[#C9A35A]/30'
            )}
          >
            {isDeletingRoom ? (
              <Trash2 className="w-6 h-6" />
            ) : isEndingSession ? (
              <Power className="w-6 h-6" />
            ) : isDestructive ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <AlertTriangle className="w-6 h-6" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-4">
            <h3
              id="global-confirm-title"
              className="text-lg sm:text-xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight leading-snug"
            >
              {title}
            </h3>

            <p className="mt-2 text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] leading-relaxed">
              {description}
            </p>

            {/* Protective safeguard caution */}
            {isDestructive && (
              <div className="mt-3 px-3 py-2 rounded-xl bg-red-500/5 dark:bg-red-500/10 border border-red-500/15 text-[11px] text-[#B94A48] dark:text-red-300 flex items-center gap-1.5 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-[#B94A48] dark:bg-red-400 shrink-0" />
                <span>This action cannot be undone. Please confirm your decision.</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="mt-6 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3">
              <button
                onClick={handleCancel}
                disabled={isSubmitting}
                type="button"
                className="px-4 py-2.5 text-xs font-bold rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-[#16251F] dark:text-[#F8F7F3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                {cancelText}
              </button>

              <button
                onClick={handleConfirm}
                disabled={isSubmitting}
                type="button"
                className={cn(
                  'px-5 py-2.5 text-xs font-bold rounded-xl text-white shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 active:scale-98',
                  isDestructive
                    ? 'bg-[#B94A48] hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                    : 'bg-[#203C32] hover:bg-[#16251F] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814]'
                )}
              >
                {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>{confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
