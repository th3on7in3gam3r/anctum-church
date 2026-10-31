import React, { useEffect, useRef } from 'react';
import { AlertTriangle, Power, Trash2, X, ShieldAlert } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description?: string;
  message?: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  isDestructive?: boolean;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  onCancel?: () => void;
  onClose?: () => void;
}

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  description,
  message,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  isDestructive,
  variant,
  onConfirm,
  onCancel,
  onClose,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const closeRef = useRef(onCancel || onClose);

  const desc = description || message || 'Are you sure you want to proceed?';
  const confirmBtnText = confirmText || confirmLabel || 'Confirm';
  const cancelBtnText = cancelText || cancelLabel || 'Cancel';
  const isDanger = isDestructive || variant === 'danger';
  const handleClose = () => {
    (onCancel || onClose)?.();
  };
  closeRef.current = handleClose;

  const isEndingSession = title.toLowerCase().includes('end') || title.toLowerCase().includes('session');
  const isDeletingRoom = title.toLowerCase().includes('delete') || title.toLowerCase().includes('room');

  useEffect(() => {
    if (!isOpen) return;

    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    if (!panel) return;

    const focusables = Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
    const cancelButton = focusables.find((el) => el.textContent?.trim() === cancelBtnText);
    (cancelButton || focusables[0])?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }

      if (event.key !== 'Tab') return;

      const nodes = (Array.from(panel.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[]).filter(
        (el) => !el.hasAttribute('disabled') && el.tabIndex !== -1
      );
      if (nodes.length === 0) return;

      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [isOpen, cancelBtnText]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        ref={panelRef}
        className="relative w-full max-w-md bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-7 shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className={cn(
            'absolute top-0 left-0 right-0 h-1.5',
            isDanger ? 'bg-[#B94A48] dark:bg-red-500' : 'bg-[#C9A35A]'
          )}
        />

        <button
          onClick={handleClose}
          type="button"
          aria-label="Close dialog"
          className="absolute top-4 right-4 p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-start gap-4">
          <div
            className={cn(
              'w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border',
              isDanger
                ? 'bg-red-500/10 dark:bg-red-500/20 text-[#B94A48] dark:text-red-400 border-red-500/20'
                : 'bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] border-[#C9A35A]/30'
            )}
          >
            {isDeletingRoom ? (
              <Trash2 className="w-5 h-5" />
            ) : isEndingSession ? (
              <Power className="w-5 h-5" />
            ) : isDanger ? (
              <ShieldAlert className="w-5 h-5" />
            ) : (
              <AlertTriangle className="w-5 h-5" />
            )}
          </div>

          <div className="flex-1 min-w-0 pr-3">
            <h3 id="confirm-dialog-title" className="text-lg font-extrabold text-[#16251F] dark:text-[#F8F7F3] leading-snug">
              {title}
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] leading-relaxed">
              {desc}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                onClick={handleClose}
                type="button"
                className="px-4 py-2 text-xs font-bold rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-[#16251F] dark:text-[#F8F7F3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                {cancelBtnText}
              </button>
              <button
                onClick={onConfirm}
                type="button"
                className={cn(
                  'px-4 py-2 text-xs font-bold rounded-xl text-white shadow-sm transition-transform active:scale-95 cursor-pointer',
                  isDanger
                    ? 'bg-[#B94A48] hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                    : 'bg-[#203C32] hover:bg-[#16251F] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814]'
                )}
              >
                {confirmBtnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
