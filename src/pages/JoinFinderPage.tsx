import React, { useEffect, useState } from 'react';
import { SanctumLogo } from '../components/common/SanctumLogo';
import { LiveBadge } from '../components/common/LiveBadge';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { sanctumApi, ApiClientError } from '../services/api/sanctumApi';
import { parseJoinInput } from '../services/joinLink';
import { leaveToHome } from '../lib/appMode';
import { Moon, Sun, Link2, ArrowRight, LayoutDashboard } from 'lucide-react';

export type LiveAltar = {
  slug: string;
  name: string;
  organizationName: string;
  organizationSlug: string;
  sessionId: string;
  status: string;
};

interface JoinFinderPageProps {
  onNavigate: (path: string) => void;
}

export const JoinFinderPage: React.FC<JoinFinderPageProps> = ({ onNavigate }) => {
  const { isDarkMode, toggleDarkMode } = useApp();
  const { isAuthenticated } = useAuth();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveRooms, setLiveRooms] = useState<LiveAltar[]>([]);
  const [liveLoaded, setLiveLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    sanctumApi
      .listLiveAltars()
      .then((result) => {
        if (cancelled) return;
        setLiveRooms(result.rooms || []);
      })
      .catch(() => {
        if (cancelled) return;
        setLiveRooms([]);
      })
      .finally(() => {
        if (!cancelled) setLiveLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const goToRoom = (slug: string) => {
    onNavigate(`/join/${slug}`);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const slug = parseJoinInput(input);
    if (!slug) {
      setError('Paste the prayer link your pastor sent, or the gathering code.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await sanctumApi.getAltar(slug);
      goToRoom(slug);
    } catch (lookupError) {
      if (!(lookupError instanceof ApiClientError) || lookupError.status !== 404) {
        setError('Could not reach that gathering. Check the link and try again.');
        return;
      }
      try {
        const churchLive = await sanctumApi.listLiveAltars(slug);
        const rooms = churchLive.rooms || [];
        if (rooms.length === 1) {
          goToRoom(rooms[0].slug);
          return;
        }
        if (rooms.length > 1) {
          setLiveRooms(rooms);
          setError('');
          return;
        }
        setError('No live gathering was found for that link. Ask your church for the current prayer link.');
      } catch {
        setError('No live gathering was found for that link. Ask your church for the current prayer link.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const showMenu = liveLoaded && liveRooms.length > 1;
  const singleLive = liveLoaded && liveRooms.length === 1 ? liveRooms[0] : null;

  return (
    <div className="min-h-screen bg-[#F8F7F3] dark:bg-[#101814] flex flex-col justify-between p-4 sm:p-6 select-none transition-colors">
      <header className="w-full max-w-md mx-auto flex items-center justify-between pt-2 pb-4">
        <button type="button" onClick={() => leaveToHome(onNavigate)} className="cursor-pointer">
          <SanctumLogo size="md" showTagline />
        </button>
        <div className="flex items-center gap-2">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => onNavigate('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] text-xs font-semibold text-[#203C32] dark:text-[#C9A35A] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>
          )}
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle dark mode"
            className="p-2 rounded-xl text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5 transition-colors cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-[#C9A35A]" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="w-full max-w-md mx-auto my-auto bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 shadow-xl border border-[#E5E6E1] dark:border-[#26362F]">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight text-center">
          Join Prayer
        </h1>
        <p className="text-sm text-[#68736D] dark:text-[#96A39D] mt-2 text-center leading-relaxed">
          If you already have a prayer link, that link is the room. Paste it here only if you were sent to Sanctum Live
          without the full address.
        </p>

        {showMenu && (
          <div className="mt-6 space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D]">
              More than one gathering is live
            </p>
            {liveRooms.map((room) => (
              <button
                key={room.sessionId}
                type="button"
                onClick={() => goToRoom(room.slug)}
                className="w-full text-left p-4 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F] hover:border-[#203C32] dark:hover:border-[#C9A35A] bg-[#F8F7F3] dark:bg-[#101814] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-[#16251F] dark:text-[#F8F7F3] truncate">{room.name}</p>
                    <p className="text-xs text-[#68736D] dark:text-[#96A39D] truncate">{room.organizationName}</p>
                  </div>
                  <LiveBadge size="sm" />
                </div>
              </button>
            ))}
          </div>
        )}

        {singleLive && (
          <button
            type="button"
            onClick={() => goToRoom(singleLive.slug)}
            className="mt-6 w-full p-4 rounded-2xl border border-[#D7473F]/30 bg-[#D7473F]/8 text-left cursor-pointer hover:bg-[#D7473F]/12 transition-colors"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#D7473F] mb-1">Live now</p>
                <p className="text-sm font-bold text-[#16251F] dark:text-[#F8F7F3] truncate">{singleLive.name}</p>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D] truncate">{singleLive.organizationName}</p>
              </div>
              <LiveBadge size="sm" />
            </div>
          </button>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-[#B94A48]/30 text-[#B94A48] dark:text-red-400 text-xs font-medium">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="prayerLink"
              className="block text-xs font-bold text-[#16251F] dark:text-[#F8F7F3] uppercase tracking-wider mb-2"
            >
              Prayer link or gathering code
            </label>
            <div className="relative">
              <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#96A39D]" />
              <input
                id="prayerLink"
                type="text"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="sanctum.live/join/dawn-intercession"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3.5 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] text-sm text-[#16251F] dark:text-[#F8F7F3] placeholder:text-[#96A39D] focus:outline-none focus:border-[#203C32] dark:focus:border-[#C9A35A]"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#203C32] hover:bg-[#16251F] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] text-white dark:text-[#101814] transition-colors cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <span>{isSubmitting ? 'Finding gathering…' : 'Continue'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </main>

      <footer className="w-full max-w-md mx-auto text-center text-xs text-[#68736D] dark:text-[#96A39D] pt-4">
        Church staff use Sign in. Congregants only need the prayer link and a name.
      </footer>
    </div>
  );
};
