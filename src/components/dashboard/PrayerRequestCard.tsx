import React, { useState } from 'react';
import { PrayerRequest } from '../../types';
import { Lock, Globe, CheckCircle2, Archive, MessageSquare, Edit } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { cn } from '../../lib/utils';

interface PrayerRequestCardProps {
  request: PrayerRequest;
  onMarkAnswered: (id: string, note?: string) => void;
  onArchive: (id: string) => void;
  onAddNote: (id: string, note: string) => void;
  onOpenDetail?: (id: string) => void;
}

export const PrayerRequestCard: React.FC<PrayerRequestCardProps> = ({
  request,
  onMarkAnswered,
  onArchive,
  onAddNote,
  onOpenDetail,
}) => {
  const { confirmAction } = useApp();
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [noteText, setNoteText] = useState(request.adminNote || '');

  const dateFormatted = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(request.createdAt));

  const handleArchiveClick = () => {
    confirmAction({
      title: 'Archive Prayer Request?',
      description: `Move the prayer request from "${request.participantName}" to the archive registry? You can still view it in the Archived filter tab.`,
      confirmText: 'Archive Request',
      cancelText: 'Keep in Active Altar',
      isDestructive: false,
      onConfirm: () => onArchive(request.id),
    });
  };


  const handleSaveNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (noteText.trim()) {
      onAddNote(request.id, noteText.trim());
      setIsAddingNote(false);
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F] shadow-xs flex flex-col justify-between hover:shadow-md transition-all">
      <div>
        {/* Top Header */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            {request.isPrivate ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-800 dark:text-amber-300 border border-amber-500/20">
                <Lock className="w-3 h-3" />
                <span>Private to Leaders</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                <Globe className="w-3 h-3" />
                <span>Congregation Prayer</span>
              </span>
            )}

            {request.status === 'ANSWERED' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#C9A35A]/20 text-[#203C32] dark:text-[#E8D8B2]">
                <CheckCircle2 className="w-3 h-3 text-[#C9A35A]" />
                <span>Answered</span>
              </span>
            )}

            {request.status === 'ARCHIVED' && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-white/5 text-gray-500">
                Archived
              </span>
            )}
          </div>

          <span className="text-[11px] text-[#68736D] dark:text-[#96A39D]">{dateFormatted}</span>
        </div>

        {/* Member Name & Room */}
        <h4 className="font-bold text-sm text-[#16251F] dark:text-[#F8F7F3]">
          {onOpenDetail ? (
            <button
              type="button"
              onClick={() => onOpenDetail(request.id)}
              className="text-left hover:underline cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#203C32] rounded"
            >
              {request.participantName}
            </button>
          ) : (
            request.participantName
          )}
        </h4>
        {request.roomName && (
          <p className="text-[11px] font-medium text-[#203C32] dark:text-[#C9A35A] mt-0.5">
            During: {request.roomName}
          </p>
        )}

        {/* Request Body */}
        <p className="text-sm text-[#16251F] dark:text-[#F8F7F3] mt-2.5 leading-relaxed bg-[#F8F7F3] dark:bg-[#101814] p-3.5 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F]">
          "{request.request}"
        </p>

        {/* Admin Note if exists */}
        {request.adminNote && !isAddingNote && (
          <div className="mt-3 p-3 rounded-xl bg-[#203C32]/5 dark:bg-[#203C32]/20 border border-[#203C32]/10 text-xs">
            <div className="flex items-center justify-between text-[#203C32] dark:text-[#C9A35A] font-bold mb-1">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" /> Pastoral Note:
              </span>
              <button
                onClick={() => setIsAddingNote(true)}
                className="hover:underline text-[10px] text-gray-500 cursor-pointer"
              >
                Edit
              </button>
            </div>
            <p className="text-[#68736D] dark:text-[#96A39D]">{request.adminNote}</p>
          </div>
        )}

        {/* Inline Add Note Form */}
        {isAddingNote && (
          <form onSubmit={handleSaveNote} className="mt-3 space-y-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add pastor note or assign to ministry team..."
              className="w-full p-2.5 text-xs rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-white dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] resize-none"
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNote(false)}
                className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-xs font-bold bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814] rounded-lg"
              >
                Save Note
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Action Footer */}
      <div className="mt-4 pt-3 border-t border-[#E5E6E1] dark:border-[#26362F] flex items-center justify-between gap-2">
        <button
          onClick={() => setIsAddingNote(true)}
          type="button"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[#68736D] dark:text-[#96A39D] hover:text-[#203C32] dark:hover:text-[#F8F7F3] cursor-pointer"
        >
          <Edit className="w-3.5 h-3.5" />
          <span>{request.adminNote ? 'Edit Note' : 'Add Note'}</span>
        </button>

        <div className="flex items-center gap-2">
          {request.status !== 'ANSWERED' && (
            <button
              onClick={() => onMarkAnswered(request.id)}
              type="button"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Mark Answered</span>
            </button>
          )}

          {request.status !== 'ARCHIVED' && (
            <button
              onClick={handleArchiveClick}
              type="button"
              className="p-1.5 rounded-xl text-gray-400 hover:text-[#16251F] dark:hover:text-[#F8F7F3] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
              title="Archive request"
            >
              <Archive className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
