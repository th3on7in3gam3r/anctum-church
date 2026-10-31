import React, { useEffect, useState } from 'react';
import { Users, ShieldCheck, Moon, Sun } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { PrayerRoom, PrayerSession } from '../../types';
import { BackButton } from '../common/BackButton';
import { sanctumTheme } from './ChurchWordmark';

interface SanctuaryWaitingViewProps {
  room: PrayerRoom;
  session?: PrayerSession | null;
  participantName: string;
  onSessionLive: () => void;
  onBack?: () => void;
}

const SCRIPTURES = [
  {
    verse: 'O God, you are my God, earnestly I seek you; my soul thirsts for you, my body longs for you, in a dry and parched land where there is no water.',
    reference: 'Psalm 63:1',
  },
  {
    verse: 'For where two or three gather in my name, there am I with them.',
    reference: 'Matthew 18:20',
  },
  {
    verse: 'Enter his gates with thanksgiving and his courts with praise; give thanks to him and praise his name.',
    reference: 'Psalm 100:4',
  },
  {
    verse: 'The Lord is near to all who call on him, to all who call on him in truth.',
    reference: 'Psalm 145:18',
  },
];

export const SanctuaryWaitingView: React.FC<SanctuaryWaitingViewProps> = ({
  room,
  participantName,
  onSessionLive,
  onBack,
}) => {
  const { isDarkMode, toggleDarkMode, liveSession, connectedNow, connectionState } = useApp();
  const [scriptureIndex, setScriptureIndex] = useState(0);

  // Auto transition if liveSession becomes LIVE
  useEffect(() => {
    if (liveSession?.status === 'LIVE' && liveSession?.prayerRoomId === room.id) {
      onSessionLive();
    }
  }, [liveSession, room.id, onSessionLive]);

  // Rotate scriptures gently
  useEffect(() => {
    const timer = setInterval(() => {
      setScriptureIndex((prev) => (prev + 1) % SCRIPTURES.length);
    }, 9000);
    return () => clearInterval(timer);
  }, []);

  const scripture = SCRIPTURES[scriptureIndex];

  return (
    <div data-theme={sanctumTheme(isDarkMode)} className="sanctum-screen flex min-h-screen flex-col justify-between p-4 transition-colors sm:p-6">
      {/* Top Header */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-2 pb-4">
        <BackButton
          to={`/join/${room.slug}`}
          label="Back to Join Page"
          mobileLabel="Back"
          onClick={onBack}
        />
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle theme"
          className="sanctum-icon cursor-pointer rounded-xl p-2"
        >
          {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </header>

      {/* Main Sanctuary Card */}
      <main className="sanctum-speaking mx-auto my-auto w-full max-w-md space-y-6 rounded-3xl p-6 text-center sm:p-8">
        <div className="sanctum-chip relative z-10 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-bold uppercase tracking-wider">
          <span className="sanctum-accent h-2 w-2 rounded-full" />
          <span>The Sanctuary is Open</span>
        </div>

        {/* Room Title */}
        <div>
          <h1 className="font-display relative z-10 text-4xl font-light tracking-tight">
            {room.name}
          </h1>
          <p className="relative z-10 mt-1 text-sm font-semibold">
            Prayer begins shortly
          </p>
          <p className="sanctum-muted relative z-10 mt-0.5 text-xs">
            Scheduled for {room.scheduledStart} ({room.timezone})
          </p>
        </div>

        {/* Waiting badge with live counter */}
        <div className="sanctum-raised relative z-10 flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-xs font-semibold">
          <Users className="h-4 w-4" />
          <span>
            {connectionState === 'CONNECTED' && connectedNow > 0
              ? `${connectedNow} gathered in the sanctuary`
              : 'Waiting for participants'}
          </span>
        </div>

        {/* Welcome Attendee Greeting */}
        <div className="sanctum-muted relative z-10 text-xs">
          Welcome, <strong>{participantName}</strong>. Please rest in quiet contemplation. You will enter the live prayer session automatically the moment leaders begin.
        </div>

        <div className="sanctum-raised relative z-10 flex min-h-[110px] flex-col justify-center space-y-2 rounded-2xl p-5 text-left">
          <p className="text-xs italic leading-relaxed">
            "{scripture.verse}"
          </p>
          <span className="sanctum-muted text-[11px] font-bold uppercase tracking-wider">
            — {scripture.reference}
          </span>
        </div>

        <div className="sanctum-muted relative z-10 flex items-center justify-center gap-2 border-t pt-2 text-[11px]" style={{ borderColor: 'var(--border)' }}>
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Microphone remains configured off for listeners until a leader invites you.</span>
        </div>
      </main>

      {/* Footer / Dev simulation button */}
      <footer className="w-full max-w-md mx-auto text-center pt-2">
        {connectionState !== 'CONNECTED' ? (
          <button
            type="button"
            onClick={onSessionLive}
            className="sanctum-muted cursor-pointer text-[11px] font-medium underline"
          >
            Simulate Prayer Starting →
          </button>
        ) : null}
      </footer>
    </div>
  );
};
