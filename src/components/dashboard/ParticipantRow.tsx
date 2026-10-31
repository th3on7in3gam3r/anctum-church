import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Participant, Role } from '../../types';
import { RoleBadge } from '../common/RoleBadge';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { RealtimeStatusIndicator } from '../common/RealtimeStatusIndicator';
import { DevelopmentPreviewBadge } from '../common/DevelopmentPreviewBadge';
import { MoreVertical, Mic, Shield, VolumeX, UserMinus, UserCheck, Hand } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface ParticipantRowProps {
  participant: Participant;
  onInviteToSpeak: (id: string) => void;
  onMute: (id: string) => void;
  onMakePrayerLeader: (id: string) => void;
  onReturnToListener: (id: string) => void;
  onRemove: (id: string) => void;
  onOpenDetail?: (id: string) => void;
}

export const ParticipantRow: React.FC<ParticipantRowProps> = ({
  participant,
  onInviteToSpeak,
  onMute,
  onMakePrayerLeader,
  onReturnToListener,
  onRemove,
  onOpenDetail,
}) => {
  const { confirmAction } = useApp();
  const [menuPosition, setMenuPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuPosition) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuPosition(null);
    };
    const closeOnViewportChange = () => setMenuPosition(null);

    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', closeOnViewportChange);
    window.addEventListener('scroll', closeOnViewportChange, true);
    return () => {
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', closeOnViewportChange);
      window.removeEventListener('scroll', closeOnViewportChange, true);
    };
  }, [menuPosition]);

  const joinedTime = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(participant.joinedAt));

  const handleRemoveClick = () => {
    setMenuPosition(null);
    confirmAction({
      title: `Remove ${participant.displayName}?`,
      description: `Are you sure you want to disconnect ${participant.displayName} from this prayer session? Their live audio stream will be severed.`,
      confirmText: 'Remove Participant',
      cancelText: 'Keep in Gathering',
      isDestructive: true,
      onConfirm: () => onRemove(participant.id),
    });
  };

  const toggleMenu = () => {
    if (menuPosition) {
      setMenuPosition(null);
      return;
    }
    const button = menuButtonRef.current;
    if (!button) return;
    const rect = button.getBoundingClientRect();
    const menuWidth = 224;
    const estimatedMenuHeight = 330;
    const top =
      window.innerHeight - rect.bottom >= estimatedMenuHeight + 12
        ? rect.bottom + 8
        : Math.max(8, rect.top - estimatedMenuHeight - 8);
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));
    setMenuPosition({ top, left });
  };


  return (
    <tr className="hover:bg-gray-50/80 dark:hover:bg-white/5 transition-colors border-b border-[#E5E6E1] dark:border-[#26362F] relative">
      {/* Name & Avatar */}
      <td className="px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center font-bold text-xs">
              {participant.displayName.substring(0, 2).toUpperCase()}
            </div>
            {/* Realtime Audio Indicator Ping on Avatar */}
            {(!participant.isMuted && (participant.role === 'SPEAKER' || participant.role === 'PRAYER_LEADER')) ? (
              <span className="absolute -bottom-0.5 -right-0.5 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white dark:border-[#17221D]"></span>
              </span>
            ) : participant.isMuted ? (
              <span
                title="Muted"
                className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-amber-500 border-2 border-white dark:border-[#17221D]"
              />
            ) : null}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              {onOpenDetail ? (
                <button
                  type="button"
                  onClick={() => onOpenDetail(participant.id)}
                  className="font-bold text-sm text-[#16251F] dark:text-[#F8F7F3] hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#203C32] rounded"
                >
                  {participant.displayName}
                </button>
              ) : (
                <span className="font-bold text-sm text-[#16251F] dark:text-[#F8F7F3]">
                  {participant.displayName}
                </span>
              )}
              {participant.isHandRaised && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#C9A35A]/20 text-[#203C32] dark:text-[#E8D8B2]">
                  <Hand className="w-2.5 h-2.5" />
                  Hand Raised
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
              {participant.country && <span>{participant.country}</span>}
              <span>•</span>
              <span>Joined {joinedTime}</span>
            </div>
          </div>
        </div>
      </td>

      {/* Role Badge */}
      <td className="px-6 py-4">
        <RoleBadge role={participant.role} size="sm" />
      </td>

      {/* Realtime Live Audio / Activity Status */}
      <td className="px-6 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <RealtimeStatusIndicator participant={participant} compact={false} />
          <DevelopmentPreviewBadge />
        </div>
      </td>

      {/* Connection Quality & Network Bar */}
      <td className="px-6 py-4">
        <div className="flex flex-col items-start gap-1.5">
          <ConnectionStatus status={participant.connectionQuality} showLabel={true} preview />
          <DevelopmentPreviewBadge />
        </div>
      </td>

      {/* Moderation Actions Menu */}
      <td className="px-6 py-4 text-right">
        <div className="relative inline-block text-left">
          <button
            onClick={toggleMenu}
            type="button"
            aria-label="Participant moderation options"
            aria-expanded={Boolean(menuPosition)}
            aria-haspopup="menu"
            ref={menuButtonRef}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuPosition &&
            createPortal(
              <>
                <div className="fixed inset-0 z-20" onClick={() => setMenuPosition(null)} />
                <div
                  role="menu"
                  aria-label={`${participant.displayName} moderation options`}
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                  className="fixed w-56 bg-white dark:bg-[#17221D] rounded-2xl shadow-xl border border-[#E5E6E1] dark:border-[#26362F] py-1.5 z-30 animate-in fade-in zoom-in-95"
                >
                {participant.role === 'LISTENER' && (
                  <button
                    onClick={() => {
                      onInviteToSpeak(participant.id);
                      setMenuPosition(null);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#16251F] dark:text-[#F8F7F3] hover:bg-gray-100 dark:hover:bg-white/5 text-left cursor-pointer"
                  >
                    <Mic className="w-3.5 h-3.5 text-[#C9A35A]" />
                    <span>Invite to Speak in Prayer</span>
                  </button>
                )}

                {(participant.role === 'LISTENER' ||
                  participant.role === 'SPEAKER' ||
                  participant.role === 'PRAYER_LEADER') && (
                  <>
                    <button
                      onClick={() => {
                        onMute(participant.id);
                        setMenuPosition(null);
                      }}
                      role="menuitem"
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-amber-700 dark:text-amber-400 hover:bg-gray-100 dark:hover:bg-white/5 text-left cursor-pointer"
                    >
                      <VolumeX className="w-3.5 h-3.5" />
                      <span>{participant.isMuted ? 'Unmute Audio Voice' : 'Mute microphone'}</span>
                    </button>

                    {participant.role === 'SPEAKER' && (
                      <button
                        onClick={() => {
                          onReturnToListener(participant.id);
                          setMenuPosition(null);
                        }}
                        role="menuitem"
                        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#16251F] dark:text-[#F8F7F3] hover:bg-gray-100 dark:hover:bg-white/5 text-left cursor-pointer"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Return to Listener</span>
                      </button>
                    )}
                  </>
                )}

                {participant.role !== 'PRAYER_LEADER' && participant.role !== 'OWNER' && (
                  <button
                    onClick={() => {
                      onMakePrayerLeader(participant.id);
                      setMenuPosition(null);
                    }}
                    role="menuitem"
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#203C32] dark:text-[#E8D8B2] hover:bg-gray-100 dark:hover:bg-white/5 text-left cursor-pointer"
                  >
                    <Shield className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Promote to Prayer Leader</span>
                  </button>
                )}

                <div className="my-1 border-t border-[#E5E6E1] dark:border-[#26362F]" />

                <button
                  onClick={handleRemoveClick}
                  role="menuitem"
                  className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-[#B94A48] dark:text-red-400 hover:bg-red-500/10 text-left cursor-pointer"
                >
                  <UserMinus className="w-3.5 h-3.5" />
                  <span>Remove from Room</span>
                </button>
                </div>
              </>,
              document.body
            )}
        </div>
      </td>
    </tr>
  );
};
