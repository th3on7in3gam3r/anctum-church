import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  CheckCircle2,
  AlertCircle,
  Info,
  X,
  UserPlus,
  HeartHandshake,
  Hand,
  Volume2,
  Lock,
  Globe,
  Radio,
  ExternalLink,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { ToastItem } from '../../types';

export const NotificationToastContainer: React.FC = () => {
  const { toasts, removeToast } = useApp();

  if (!toasts || toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm sm:max-w-md w-full pointer-events-none px-3 sm:px-0"
    >
      {toasts.map((toast) => {
        const isJoin = toast.type === 'participant_join';
        const isPrayerReq = toast.type === 'prayer_request';
        const isHandRaised = toast.type === 'hand_raised';

        const getToastConfig = () => {
          switch (toast.type) {
            case 'participant_join':
              return {
                icon: UserPlus,
                iconClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                borderClass: 'border-emerald-500/30 dark:border-emerald-500/20 shadow-emerald-950/5',
                tagText: 'Attendee Joined',
                tagClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border border-emerald-500/20',
              };
            case 'prayer_request':
              return {
                icon: HeartHandshake,
                iconClass: 'bg-[#C9A35A]/20 text-[#203C32] dark:text-[#E8D8B2] border-[#C9A35A]/30',
                borderClass: 'border-[#C9A35A]/40 dark:border-[#C9A35A]/30 shadow-[#C9A35A]/5',
                tagText: toast.meta?.isPrivate ? 'Pastoral Altar Request' : 'Prayer Request',
                tagClass: toast.meta?.isPrivate
                  ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/25'
                  : 'bg-[#203C32]/10 text-[#203C32] dark:text-[#E8D8B2] border border-[#203C32]/20',
              };
            case 'hand_raised':
              return {
                icon: Hand,
                iconClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
                borderClass: 'border-amber-500/30 dark:border-amber-500/20',
                tagText: 'Hand Raised',
                tagClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20',
              };
            case 'success':
              return {
                icon: CheckCircle2,
                iconClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
                borderClass: 'border-emerald-500/20',
                tagText: 'Success',
                tagClass: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300',
              };
            case 'error':
              return {
                icon: AlertCircle,
                iconClass: 'bg-red-500/15 text-[#B94A48] dark:text-red-400 border-red-500/30',
                borderClass: 'border-red-500/30',
                tagText: 'Action Error',
                tagClass: 'bg-red-500/10 text-[#B94A48] dark:text-red-300',
              };
            case 'warning':
              return {
                icon: AlertCircle,
                iconClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30',
                borderClass: 'border-amber-500/30',
                tagText: 'Attention',
                tagClass: 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
              };
            case 'info':
            default:
              return {
                icon: Info,
                iconClass: 'bg-[#203C32]/10 text-[#203C32] dark:text-[#C9A35A] border-[#203C32]/20',
                borderClass: 'border-[#E5E6E1] dark:border-[#26362F]',
                tagText: 'Notice',
                tagClass: 'bg-gray-100 dark:bg-white/5 text-[#68736D] dark:text-[#96A39D]',
              };
          }
        };

        const config = getToastConfig();
        const Icon = config.icon;

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto flex items-start gap-3.5 p-4 rounded-2xl shadow-xl bg-white/95 dark:bg-[#17221D]/95 backdrop-blur-md border text-sm text-[#16251F] dark:text-[#F8F7F3] transition-all transform animate-in slide-in-from-bottom-3 duration-200 relative overflow-hidden',
              config.borderClass
            )}
          >
            {/* Realtime Alert Pulse indicator for participants or prayer requests */}
            {(isJoin || isPrayerReq || isHandRaised) && (
              <span className="absolute top-0 left-0 bottom-0 w-1.5 bg-current text-[#C9A35A]" />
            )}

            {/* Icon Box */}
            <div
              className={cn(
                'w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border relative',
                config.iconClass
              )}
            >
              <Icon className="w-4 h-4" />
              {isJoin && (
                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>

            {/* Toast Content Area */}
            <div className="flex-1 min-w-0 pr-1">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className={cn('px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider', config.tagClass)}>
                  {config.tagText}
                </span>

                {toast.meta?.isPrivate && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-400">
                    <Lock className="w-2.5 h-2.5" />
                    Private
                  </span>
                )}

                {toast.timestamp && (
                  <span className="text-[10px] text-gray-400 ml-auto">{toast.timestamp}</span>
                )}
              </div>

              {toast.title && (
                <h4 className="font-bold text-xs text-[#16251F] dark:text-[#F8F7F3] leading-snug">
                  {toast.title}
                </h4>
              )}

              <p className="text-xs text-[#4A5550] dark:text-[#B4C2BB] mt-0.5 leading-relaxed font-normal">
                {toast.message}
              </p>

              {toast.actionLabel && toast.onAction && (
                <button
                  onClick={() => {
                    toast.onAction?.();
                    removeToast(toast.id);
                  }}
                  type="button"
                  className="mt-2 text-xs font-bold text-[#203C32] dark:text-[#C9A35A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>{toast.actionLabel}</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
              className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors p-1 -mr-1 -mt-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
