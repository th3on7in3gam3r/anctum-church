import React, { useState } from 'react';
import { SanctumLogo } from '../components/common/SanctumLogo';
import { ClerkNavAuth } from '../components/common/ClerkNavAuth';
import { StartPrayerRoomCta } from '../components/common/StartPrayerRoomCta';
import { Sun, Moon } from 'lucide-react';
import { useApp } from '../context/AppContext';

interface LandingPageProps {
  onNavigate: (path: string) => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onNavigate }) => {
  const { isDarkMode, toggleDarkMode, addToast } = useApp();
  const [amenCount, setAmenCount] = useState(0);
  const [praiseCount, setPraiseCount] = useState(0);
  const [hasRaisedHand, setHasRaisedHand] = useState(false);
  const [previewNote, setPreviewNote] = useState<string | null>(null);

  const handleAmen = () => {
    setAmenCount((prev) => prev + 1);
    setPreviewNote('Amen');
    setTimeout(() => setPreviewNote(null), 1200);
  };

  const handlePraise = () => {
    setPraiseCount((prev) => prev + 1);
    setPreviewNote('Praise');
    setTimeout(() => setPreviewNote(null), 1200);
  };

  const handleRaiseHand = () => {
    setHasRaisedHand((prev) => !prev);
    addToast(
      hasRaisedHand
        ? 'Hand lowered in the preview.'
        : 'Hand raised. In a live gathering, the prayer leader sees this.',
      'info'
    );
  };

  const notes = [
    ['Join with a name', 'Members open one link. No account, no app, and the microphone stays off.'],
    ['Leaders stay in control', 'Pastors invite a speaker, watch raised hands, and read prayer requests.'],
    ['Built for a phone', 'The room is meant for a congregation on a slow connection, not a conference call.'],
  ];

  return (
    <div className="flex min-h-screen flex-col bg-paper text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <SanctumLogo size="md" />
          <div className="flex items-center gap-2 sm:gap-4">
            <button
              onClick={() => onNavigate('/join')}
              type="button"
              className="hidden text-sm text-muted hover:text-ink sm:inline cursor-pointer"
            >
              Join prayer
            </button>
            <button
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
              className="cursor-pointer p-2 text-muted"
            >
              {isDarkMode ? <Sun className="h-4 w-4 text-gold" /> : <Moon className="h-4 w-4" />}
            </button>
            <ClerkNavAuth onNavigate={onNavigate} />
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 items-start gap-12 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-20">
        <div className="max-w-xl">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-green dark:text-ink sm:text-5xl">
            A prayer room your church can actually use.
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-muted">
            Share one link. People join with their name. Leaders decide who speaks.
          </p>
          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <StartPrayerRoomCta onNavigate={onNavigate} />
            <button
              onClick={() => onNavigate('/join')}
              className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-lg border border-line px-5 text-sm text-ink"
            >
              Join prayer
            </button>
          </div>
        </div>

        <section className="ui-card p-5 sm:p-6" aria-label="Prayer room preview">
          <div className="flex items-baseline justify-between gap-4">
            <div>
              <p className="text-sm text-muted">Preview</p>
              <h2 className="mt-1 text-xl font-semibold">Morning prayer</h2>
            </div>
            <p className="text-sm text-muted" aria-live="polite">{previewNote}</p>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            A prayer leader is speaking. Listeners stay muted until a leader invites them.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <button type="button" onClick={handleAmen} className="ui-card cursor-pointer px-3 py-3 text-left">
              <span className="block text-sm font-medium">Amen</span>
              <span className="text-xs text-muted">{amenCount}</span>
            </button>
            <button type="button" onClick={handlePraise} className="ui-card cursor-pointer px-3 py-3 text-left">
              <span className="block text-sm font-medium">Praise</span>
              <span className="text-xs text-muted">{praiseCount}</span>
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={handleRaiseHand}
              className={`min-h-11 cursor-pointer rounded-lg border px-3 text-sm ${
                hasRaisedHand ? 'border-gold bg-gold/20 text-ink' : 'border-line text-ink'
              }`}
            >
              {hasRaisedHand ? 'Hand raised' : 'Raise hand'}
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/join')}
              className="ui-button"
            >
              Prayer request
            </button>
          </div>
        </section>
      </main>

      <section id="how-it-works" className="border-t border-line">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 py-12 sm:px-6 md:grid-cols-3">
          {notes.map(([title, body]) => (
            <div key={title}>
              <h2 className="text-base font-semibold">{title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto border-t border-line">
        <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-sm text-muted sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>
            From{' '}
            <a href="https://biblefunlandstudios.com" target="_blank" rel="noopener noreferrer" className="text-ink">
              Biblefunland Studio
            </a>
          </p>
          <div className="flex gap-4">
            <button onClick={() => onNavigate('/privacy')} className="cursor-pointer hover:text-ink">Privacy</button>
            <button onClick={() => onNavigate('/terms')} className="cursor-pointer hover:text-ink">Terms</button>
          </div>
        </div>
      </footer>
    </div>
  );
};
