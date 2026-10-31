import React, { useEffect, useState } from 'react';
import { Mic, X } from 'lucide-react';

interface OpenSanctuaryModalProps {
  isOpen: boolean;
  roomName: string;
  onClose: () => void;
  onSubmit: (sermonLeaderName: string) => void;
}

export const OpenSanctuaryModal: React.FC<OpenSanctuaryModalProps> = ({
  isOpen,
  roomName,
  onClose,
  onSubmit,
}) => {
  const [sermonLeaderName, setSermonLeaderName] = useState('');

  useEffect(() => {
    if (isOpen) setSermonLeaderName('');
  }, [isOpen]);

  if (!isOpen) return null;

  const trimmedName = sermonLeaderName.trim();

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-sanctuary-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmedName) onSubmit(trimmedName);
        }}
        className="w-full max-w-md bg-white dark:bg-[#17221D] rounded-3xl shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#C9A35A]">
              <Mic className="w-5 h-5" />
              <span className="text-xs font-bold uppercase tracking-wider">Open Sanctuary</span>
            </div>
            <h2 id="open-sanctuary-title" className="mt-2 text-xl font-extrabold text-[#16251F] dark:text-[#F8F7F3]">
              Name today&apos;s sermon leader
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Open Sanctuary"
            className="p-2 rounded-xl text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="mt-3 text-sm text-[#68736D] dark:text-[#96A39D]">
          This name is saved on this session and shown to congregants. It can be different each day for recurring room{' '}
          <span className="font-semibold text-[#203C32] dark:text-[#E8D8B2]">{roomName}</span>.
        </p>

        <label htmlFor="sermon-leader-name" className="block mt-5 text-xs font-bold text-[#16251F] dark:text-[#F8F7F3]">
          Sermon / prayer leader for this session
        </label>
        <input
          id="sermon-leader-name"
          autoFocus
          required
          value={sermonLeaderName}
          onChange={(event) => setSermonLeaderName(event.target.value)}
          placeholder="e.g. Pastor Michael"
          maxLength={120}
          className="mt-2 w-full px-3.5 py-3 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] bg-white dark:bg-[#101814] text-sm text-[#16251F] dark:text-[#F8F7F3] outline-none focus:ring-2 focus:ring-[#C9A35A]/60"
        />

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!trimmedName}
            className="px-5 py-2.5 rounded-xl bg-[#203C32] hover:bg-[#16251F] disabled:opacity-50 text-white dark:bg-[#C9A35A] dark:text-[#101814] text-xs font-bold cursor-pointer disabled:cursor-not-allowed"
          >
            Open Sanctuary
          </button>
        </div>
      </form>
    </div>
  );
};
