import React, { useState } from 'react';
import { PrayerRoom } from '../../types';
import { PrayerSessionStatus } from '../common/PrayerSessionStatus';
import { resolveAltarLink } from '../../services/altarLinkResolver';
import { Copy, Check, Sliders, ExternalLink, Edit3, Trash2, Users, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { canDeletePrayerRoom } from '../../lib/permissions';
import { formatNumber } from '../../lib/utils';

interface PrayerRoomCardProps {
  room: PrayerRoom;
  onOpenDetails?: (roomId: string) => void;
  onOpenControlRoom: (roomId: string) => void;
  onOpenJoinPage: (slug: string) => void;
  onEdit: (roomId: string) => void;
}

export const PrayerRoomCard: React.FC<PrayerRoomCardProps> = ({
  room,
  onOpenDetails,
  onOpenControlRoom,
  onOpenJoinPage,
  onEdit,
}) => {
  const { addToast, deletePrayerRoom, confirmAction, liveSession, historySessions } = useApp();
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  const resolution = resolveAltarLink(room, liveSession, historySessions);
  const fullUrl = `${window.location.origin}/join/${room.slug}`;
  const canDelete = user?.role === 'OWNER' || user?.role === 'ADMIN' ? canDeletePrayerRoom(user.role) : false;

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    addToast('Prayer link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDeleteRoom = () => {
    confirmAction({
      title: `Delete "${room.name}"?`,
      description:
        'This permanently deletes the prayer room and its gatherings. The join link will stop working. This cannot be undone.',
      confirmText: 'Delete Room',
      cancelText: 'Keep Room',
      isDestructive: true,
      onConfirm: () => deletePrayerRoom(room.id),
    });
  };

  return (
    <div className="bg-white dark:bg-[#17221D] rounded-3xl border border-[#E5E6E1] dark:border-[#26362F] p-6 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Top Header Row */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <PrayerSessionStatus status={resolution.status} size="sm" />
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#E8D8B2]">
              {room.roomType === 'AUDIO_PRAYER' ? 'Audio Prayer' : 'Prayer + Video'}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(room.id)}
              title="Edit room"
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            {canDelete && (
              <button
                onClick={handleDeleteRoom}
                title="Delete room"
                className="p-1.5 rounded-lg text-gray-400 hover:text-[#B94A48] transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Room Title & Description */}
        <div className="flex items-start gap-3">
          {room.logoUrl ? (
            <img
              src={room.logoUrl}
              alt=""
              className="w-11 h-11 rounded-xl object-cover border border-[#E5E6E1] dark:border-[#26362F] shrink-0 bg-[#F8F7F3] dark:bg-[#101814]"
            />
          ) : null}
          <div className="min-w-0">
            <h3 className="text-xl font-bold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
              {onOpenDetails ? (
                <button
                  type="button"
                  onClick={() => onOpenDetails(room.id)}
                  className="text-left hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#203C32] dark:focus-visible:ring-[#C9A35A] rounded"
                >
                  {room.name}
                </button>
              ) : (
                room.name
              )}
            </h3>
            <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-1 line-clamp-2 leading-relaxed">
              {room.description || 'Corporate gathering for intercession, praise, and prayer.'}
            </p>
          </div>
        </div>

        {/* Schedule & Attendance Info */}
        <div className="mt-4 pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] space-y-2 text-xs text-[#68736D] dark:text-[#96A39D]">
          <div className="flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-[#3D6655] dark:text-[#C9A35A] shrink-0" />
            <span>
              {room.isRecurring ? `${room.recurrenceRule || 'Daily'} at ` : 'Start: '}
              <strong className="text-[#16251F] dark:text-[#F8F7F3]">{room.scheduledStart}</strong> ({room.timezone})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Users className="w-3.5 h-3.5 text-[#3D6655] dark:text-[#C9A35A] shrink-0" />
            <span>
              Expected: <strong className="text-[#16251F] dark:text-[#F8F7F3]">{formatNumber(room.expectedAttendance)}</strong> attendees
            </span>
          </div>
        </div>

        {/* Permanent URL banner */}
        <div className="mt-4 p-2.5 rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono text-[#68736D] dark:text-[#96A39D] truncate">
            /join/{room.slug}
          </span>
          <button
            onClick={handleCopy}
            type="button"
            className="text-xs font-bold text-[#203C32] dark:text-[#C9A35A] hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="mt-6 pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] flex items-center gap-2">
        <button
          onClick={() => onOpenControlRoom(room.id)}
          type="button"
          className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Control Room</span>
        </button>

        <button
          onClick={() => onOpenJoinPage(room.slug)}
          type="button"
          title="Open public join page"
          className="p-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-[#68736D] dark:text-[#96A39D] hover:text-[#16251F] dark:hover:text-[#F8F7F3] hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer"
        >
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
