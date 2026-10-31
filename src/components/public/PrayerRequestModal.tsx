import React, { useState } from 'react';
import { X, Lock, HeartHandshake } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultName?: string;
  roomName?: string;
  allowAnonymous?: boolean;
}

export const PrayerRequestModal: React.FC<PrayerRequestModalProps> = ({
  isOpen,
  onClose,
  defaultName = '',
  roomName,
  allowAnonymous = true,
}) => {
  const { submitPrayerRequest } = useApp();
  const [name, setName] = useState(defaultName);
  const [requestText, setRequestText] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!allowAnonymous && !name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (!requestText.trim() || requestText.trim().length < 5) {
      setError('Prayer request must be at least 5 characters');
      return;
    }

    submitPrayerRequest({
      participantName: name.trim() || 'Anonymous',
      request: requestText.trim(),
      isPrivate,
      roomName,
    });

    setRequestText('');
    setError('');
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="prayer-request-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div
        className="sanctum-surface max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl p-6 shadow-[var(--shadow-sanctum)] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div className="sanctum-chip flex h-10 w-10 items-center justify-center rounded-xl">
              <HeartHandshake className="h-5 w-5" />
            </div>
            <div>
              <h2 id="prayer-request-title" className="font-display text-3xl font-light">
                Submit Prayer Request
              </h2>
              <p className="sanctum-muted text-xs">
                Our pastors and intercessors are standing with you
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="sanctum-icon cursor-pointer rounded-xl p-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {error && (
            <div className="sanctum-danger rounded-xl p-3 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">
              Your Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sister Deborah"
              className="sanctum-input w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider">
              Prayer Request
            </label>
            <textarea
              rows={4}
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Share what is on your heart or what you would like prayer for..."
              className="sanctum-input w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
            />
          </div>

          <div className="sanctum-raised flex items-center justify-between gap-3 rounded-2xl p-3.5">
            <div className="flex items-center gap-2.5">
              <Lock className="h-4 w-4 shrink-0" />
              <div>
                <p className="text-xs font-semibold">
                  Keep private to prayer leaders
                </p>
                <p className="sanctum-muted text-[11px]">
                  Only authorized pastors and church elders will view this
                </p>
              </div>
            </div>
            <input
              type="checkbox"
              id="privateToggle"
              checked={isPrivate}
              onChange={(e) => setIsPrivate(e.target.checked)}
              className="h-5 w-5 cursor-pointer rounded-md"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="sanctum-muted cursor-pointer rounded-xl px-5 py-3 text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="sanctum-accent w-full cursor-pointer rounded-xl px-6 py-3 text-sm font-semibold sm:w-auto"
            >
              Submit Prayer Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
