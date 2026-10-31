import React, { useState } from 'react';
import { ChurchBadge } from '../common/ChurchBadge';
import { SanctumLogo } from '../common/SanctumLogo';
import { churchSiteUrl, isChurchMode } from '../../lib/appMode';
import { sanctumTheme } from './ChurchWordmark';
import {
  CheckCircle2,
  Users,
  Calendar,
  Heart,
  FileText,
  ArrowRight,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { PrayerRoom, PrayerSession } from '../../types';

interface PostPrayerSummaryViewProps {
  room: PrayerRoom;
  session?: PrayerSession | null;
  participantName: string;
  onExit: () => void;
  onSubmitPrayerRequest?: () => void;
}

export const PostPrayerSummaryView: React.FC<PostPrayerSummaryViewProps> = ({
  room,
  session,
  participantName,
  onExit,
  onSubmitPrayerRequest,
}) => {
  const { isDarkMode, toggleDarkMode, submitPrayerRequest, addToast } = useApp();
  const { isAuthenticated, organization } = useAuth();

  const [testimony, setTestimony] = useState('');
  const [testimonySubmitted, setTestimonySubmitted] = useState(false);
  const [showTestimonyBox, setShowTestimonyBox] = useState(false);

  const totalGathered = session?.totalUniqueParticipants || session?.totalParticipants || 0;

  const handleSubmitTestimony = (e: React.FormEvent) => {
    e.preventDefault();
    if (!testimony.trim()) return;

    submitPrayerRequest({
      request: `[Praise/Testimony]: ${testimony.trim()}`,
      isPrivate: false,
      participantName: participantName || 'Member',
      roomName: room.name,
    });

    setTestimonySubmitted(true);
    addToast('Praise testimony submitted to ministry leaders!', 'success');
  };

  return (
    <div data-theme={sanctumTheme(isDarkMode)} className="sanctum-screen flex min-h-screen flex-col justify-between p-4 transition-colors sm:p-6">
      {/* Top Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-2 pb-4">
        {isChurchMode() ? <ChurchBadge size="md" name={organization?.name || 'Prayer room'} logoUrl={organization?.logoUrl || null} /> : <SanctumLogo size="md" showTagline />}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
          className="sanctum-icon cursor-pointer rounded-xl p-2"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {/* Main Card */}
      <main className="sanctum-surface mx-auto my-auto w-full max-w-md space-y-6 rounded-3xl p-6 text-center sm:p-8">
        {/* Completion Icon */}
        <div className="sanctum-chip mx-auto flex h-16 w-16 items-center justify-center rounded-3xl">
          <CheckCircle2 className="w-8 h-8" />
        </div>

        <div>
          <h1 className="font-display text-4xl font-light tracking-tight">
            Prayer Complete
          </h1>
          <p className="sanctum-muted mt-1 text-sm">
            Thank you for praying with us, <strong>{participantName}</strong>.
          </p>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 gap-3">
          <div className="sanctum-raised rounded-2xl p-4 text-left">
            <span className="sanctum-muted flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Users className="h-3.5 w-3.5" />
              Gathered
            </span>
            <p className="mt-0.5 text-lg font-extrabold">
              {totalGathered > 0 ? totalGathered.toLocaleString() : '—'}
            </p>
          </div>

          <div className="sanctum-raised rounded-2xl p-4 text-left">
            <span className="sanctum-muted flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Calendar className="h-3.5 w-3.5" />
              Next Prayer
            </span>
            <p className="mt-1 truncate text-xs font-bold">
              Tomorrow • {room.scheduledStart}
            </p>
          </div>
        </div>

        {/* Testimony box or CTA buttons */}
        {showTestimonyBox ? (
          testimonySubmitted ? (
            <div className="sanctum-chip space-y-1 rounded-2xl p-4 text-xs font-medium">
              <p className="font-bold">Testimony Received</p>
              <p>May God bless you as you testify of His goodness!</p>
            </div>
          ) : (
            <form onSubmit={handleSubmitTestimony} className="text-left space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider">
                Share a Testimony / Praise Report
              </label>
              <textarea
                value={testimony}
                onChange={(e) => setTestimony(e.target.value)}
                placeholder="Share how God moved during prayer..."
                rows={3}
                className="sanctum-input w-full rounded-xl p-3 text-xs focus:outline-none"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowTestimonyBox(false)}
                  className="sanctum-muted rounded-xl px-3 py-2 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="sanctum-accent flex-1 rounded-xl py-2 text-xs font-bold"
                >
                  Submit Testimony
                </button>
              </div>
            </form>
          )
        ) : (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => setShowTestimonyBox(true)}
              className="sanctum-outline flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold"
            >
              <Heart className="h-4 w-4" />
              <span>Share a Testimony</span>
            </button>

            {onSubmitPrayerRequest && (
              <button
                type="button"
                onClick={onSubmitPrayerRequest}
                className="sanctum-raised flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3 text-xs font-bold"
              >
                <FileText className="h-4 w-4" />
                <span>Submit a Prayer Request</span>
              </button>
            )}
          </div>
        )}

        {/* Exit to Home */}
        <button
          type="button"
          onClick={onExit}
          className="sanctum-accent flex w-full cursor-pointer items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold"
        >
          <span>{isAuthenticated ? 'Back to Dashboard' : 'Exit Gathering'}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </main>

      <footer className="sanctum-muted mx-auto w-full max-w-md pt-2 text-center text-[11px]">
        May the grace of our Lord Jesus Christ be with you always.
      </footer>
    </div>
  );
};
