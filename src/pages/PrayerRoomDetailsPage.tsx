import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { BackButton } from '../components/common/BackButton';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { PrayerSessionStatus } from '../components/common/PrayerSessionStatus';
import { TestPrayerRoomModal } from '../components/dashboard/TestPrayerRoomModal';
import { resolveAltarLink } from '../services/altarLinkResolver';
import { formatNumber } from '../lib/utils';
import { buildRoomIcs, downloadIcs } from '../lib/calendar';
import { getNextOccurrences } from '../services/sessionScheduler';
import QRCode from 'qrcode';
import {
  Calendar,
  Users,
  Copy,
  Check,
  Sliders,
  ExternalLink,
  Edit3,
  Download,
} from 'lucide-react';

interface PrayerRoomDetailsPageProps {
  roomId: string;
  onNavigate: (path: string) => void;
  showSharePanel?: boolean;
}

export const PrayerRoomDetailsPage: React.FC<PrayerRoomDetailsPageProps> = ({
  roomId,
  onNavigate,
  showSharePanel = false,
}) => {
  const { prayerRooms, liveSession, historySessions, addToast } = useApp();
  const { organization } = useAuth();
  const [copied, setCopied] = useState(false);
  const [showTestRoomModal, setShowTestRoomModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');

  const room = prayerRooms.find((r) => r.id === roomId) || prayerRooms[0];
  const resolution = resolveAltarLink(room, liveSession, historySessions);
  const fullUrl = `${window.location.origin}/join/${room?.slug || ''}`;
  const occurrences = useMemo(() => (room ? getNextOccurrences(room, 5) : []), [room]);

  useEffect(() => {
    if (!showSharePanel || !room?.slug) return;
    let cancelled = false;
    QRCode.toDataURL(fullUrl, { margin: 1, width: 192 })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl('');
      });
    return () => {
      cancelled = true;
    };
  }, [showSharePanel, fullUrl, room?.slug]);

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    addToast('Prayer link copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const breadcrumbs = [
    { label: 'Prayer Rooms', path: '/dashboard/prayer-rooms' },
    { label: room?.name || 'Prayer Room', isCurrent: true },
  ];

  if (!room) {
    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        <BackButton
          to="/dashboard/prayer-rooms"
          label="Back to Prayer Rooms"
          mobileLabel="Back"
          onNavigate={onNavigate}
        />
        <p className="text-sm text-[#68736D] dark:text-[#96A39D]">Prayer room not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4 sm:space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <BackButton
            to="/dashboard/prayer-rooms"
            label="Back to Prayer Rooms"
            mobileLabel="Back"
            onNavigate={onNavigate}
          />
          <Breadcrumbs items={breadcrumbs} onNavigate={onNavigate} />
        </div>
      </div>

      <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 border border-[#E5E6E1] dark:border-[#26362F] shadow-xs space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <PrayerSessionStatus status={resolution.status} size="sm" />
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#E8D8B2]">
                {room.roomType === 'AUDIO_PRAYER' ? 'Audio Prayer' : 'Prayer + Video'}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
              {room.name}
            </h1>
            <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] leading-relaxed max-w-xl">
              {room.description || 'Corporate gathering for intercession, praise, and prayer.'}
            </p>
          </div>
        </div>

        <div className="space-y-2 text-xs text-[#68736D] dark:text-[#96A39D] pt-2 border-t border-[#E5E6E1] dark:border-[#26362F]">
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
          <p className="text-[11px] pt-1">
            {organization.name} • Recurring sessions appear in History, not as extra Prayer Room cards.
            Lead from Control Room. The join link is for listeners — it will not ask for a microphone.
          </p>
        </div>

        <div className="space-y-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D]">
            Permanent Altar Link
          </span>
          <div className="p-3 rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between gap-2" data-tour="room-details-copy-link">
            <div className="min-w-0">
              <p className="text-xs font-mono text-[#16251F] dark:text-[#F8F7F3] truncate">{fullUrl}</p>
              <p className="text-[11px] font-mono text-[#68736D] dark:text-[#96A39D] mt-0.5">/join/{room.slug}</p>
            </div>
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

        {showSharePanel && (
          <div className="space-y-3 p-4 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/60 dark:bg-[#101814]">
            <p className="text-xs font-bold uppercase tracking-wider text-[#203C32] dark:text-[#C9A35A]">Share this altar</p>
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
              {qrDataUrl ? (
                <img src={qrDataUrl} alt={`QR code for ${room.name}`} className="w-32 h-32 rounded-xl bg-white p-2" />
              ) : null}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 rounded-xl text-xs font-bold border border-[#E5E6E1] dark:border-[#26362F] text-[#203C32] dark:text-[#C9A35A] cursor-pointer"
                >
                  {copied ? 'Link copied' : 'Copy link'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    downloadIcs(`${room.slug}.ics`, buildRoomIcs({
                      name: room.name,
                      description: room.description,
                      url: fullUrl,
                      durationMinutes: room.durationMinutes || 60,
                      occurrences,
                    }))
                  }
                  className="ml-2 px-3 py-2 rounded-xl text-xs font-bold border border-[#E5E6E1] dark:border-[#26362F] text-[#16251F] dark:text-[#F8F7F3] cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download .ics
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <button
            onClick={() => onNavigate(`/dashboard/prayer-rooms/${room.id}/control`)}
            type="button"
            data-tour="room-details-control-room"
            className="flex-1 py-2.5 px-3 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Control Room — lead with your mic</span>
          </button>
          <button
            onClick={() => setShowTestRoomModal(true)}
            type="button"
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-[#203C32]/30 dark:border-[#C9A35A]/40 bg-[#203C32]/5 dark:bg-[#C9A35A]/10 text-[#203C32] dark:text-[#E8D8B2] hover:bg-[#203C32]/10 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Test Room</span>
          </button>
          <button
            onClick={() => window.open(`${window.location.origin}/join/${room.slug}`, '_blank', 'noopener,noreferrer')}
            type="button"
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-[#E5E6E1] dark:border-[#26362F] hover:bg-gray-50 dark:hover:bg-white/5 text-[#16251F] dark:text-[#F8F7F3] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#C9A35A]" />
            <span>Listener join page</span>
          </button>
          <button
            onClick={() => onNavigate(`/dashboard/prayer-rooms/${room.id}/edit`)}
            type="button"
            className="px-3.5 py-2.5 rounded-xl font-semibold text-xs border border-[#E5E6E1] dark:border-[#26362F] hover:bg-gray-50 dark:hover:bg-white/5 text-[#68736D] dark:text-[#96A39D] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      <TestPrayerRoomModal
        isOpen={showTestRoomModal}
        onClose={() => setShowTestRoomModal(false)}
        roomName={room.name}
        backLabel="Back to Prayer Room"
      />
    </div>
  );
};
