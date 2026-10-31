import React, { useEffect, useMemo, useState } from 'react';
import { ChurchBadge } from '../common/ChurchBadge';
import { sanctumTheme } from './ChurchWordmark';
import { churchSiteUrl } from '../../lib/appMode';
import { joinDisplayName } from '../../../shared/huddle.ts';
import { ParticipantCount } from '../common/ParticipantCount';
import { PrayerSessionStatus } from '../common/PrayerSessionStatus';
import { PrayerCountdown } from '../common/PrayerCountdown';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { resolveAltarLink } from '../../services/altarLinkResolver';
import { getNextOccurrences } from '../../services/sessionScheduler';
import { joinScheduleLabel, resolveSermonLeader, visibleOrganizationName } from '../../../shared/joinDisplay.ts';
import { sanctumApi, ApiClientError } from '../../services/api/sanctumApi';
import { ShieldCheck, HelpCircle, Sparkles, Moon, Sun, Clock, LayoutDashboard } from 'lucide-react';
import { ControlRoomLink } from './ControlRoomLink';
import type { PrayerRoom, SessionLifecycleStatus } from '../../types';
import { useTour } from '../../hooks/useTour';
import { TOUR_IDS } from '../../tour/tourIds';
import { joinGateTourSteps } from '../../tour/listenerRoomTour';

interface PublicJoinViewProps {
  slug: string;
  onJoinSuccess: (participantName: string) => void;
  onNavigate?: (path: string) => void;
}

export const PublicJoinView: React.FC<PublicJoinViewProps> = ({ slug, onJoinSuccess, onNavigate }) => {
  const { prayerRooms, liveSession, historySessions, dataSaverMode, setDataSaverMode, isDarkMode, toggleDarkMode, joinPrayerRoom, connectedNow } = useApp();
  const { isAuthenticated, authReady, organization, user } = useAuth();
  const memberName = user?.memberName || '';

  const [name, setName] = useState(() => {
    return localStorage.getItem('sanctum_last_attendee_name') || '';
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [altarStatus, setAltarStatus] = useState<SessionLifecycleStatus | 'NOT_FOUND' | null>(null);
  // The name field carries its own hint, so the one-step join tour no longer opens on its own
  // (it covered the join button on a first visit).
  useTour(TOUR_IDS.joinGate, joinGateTourSteps, { delayMs: 500, enabled: false });
  const [passcode, setPasscode] = useState('');
  const [canControl, setCanControl] = useState(false);
  const [altarRoom, setAltarRoom] = useState<{
    id?: string;
    name: string;
    organizationName?: string;
    organizationLogoUrl?: string;
    logoUrl?: string;
    scheduledStart?: string;
    timezone?: string;
    sermonLeaderName?: string;
    roomSermonLeaderName?: string;
    defaultSermonSpeaker?: string;
    isRecurring?: boolean;
    recurrenceRule?: string | null;
    selectedDays?: string[];
    oneTimeDate?: string | null;
    speakerPermission?: string;
    allowGuests?: boolean;
    hasPasscode?: boolean;
    prayerRequestsEnabled?: boolean;
    anonymousRequestsAllowed?: boolean;
    chatEnabled?: boolean;
  } | null>(null);

  const localRoom = prayerRooms.find((r) => r.slug === slug);
  const roomForSchedule: PrayerRoom | null = localRoom
    ? localRoom
    : altarRoom
      ? {
          id: slug,
          organizationId: '',
          name: altarRoom.name,
          slug,
          roomType: 'AUDIO_PRAYER',
          expectedAttendance: 0,
          speakerPermission: (altarRoom.speakerPermission as PrayerRoom['speakerPermission']) || 'ADMIN_APPROVAL_REQUIRED',
          isRecurring: altarRoom.isRecurring !== false,
          recurrenceRule: (altarRoom.recurrenceRule as PrayerRoom['recurrenceRule']) || 'DAILY',
          selectedDays: altarRoom.selectedDays || [],
          oneTimeDate: altarRoom.oneTimeDate || undefined,
          scheduledStart: altarRoom.scheduledStart || '05:00 AM',
          timezone: altarRoom.timezone || 'Africa/Kampala',
          recordingEnabled: false,
          status: 'SCHEDULED',
          permanentUrl: `/join/${slug}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      : null;
  const resolution = roomForSchedule ? resolveAltarLink(roomForSchedule, liveSession, historySessions) : null;
  const serverStatus = altarStatus;
  const status = serverStatus || resolution?.status || 'SCHEDULED';
  const isLive = status === 'LIVE' || status === 'STARTING';
  const isWaiting = status === 'WAITING';
  const canJoin = isLive || isWaiting;
  const attendeeCount = isLive || isWaiting ? connectedNow || undefined : undefined;
  const displayName = altarRoom?.name || localRoom?.name || 'Prayer Gathering';
  const churchName = visibleOrganizationName(displayName, altarRoom?.organizationName);
  const sermonLeader = resolveSermonLeader(
    altarRoom?.sermonLeaderName,
    altarRoom?.roomSermonLeaderName,
    altarRoom?.defaultSermonSpeaker
  );
  const roomLogoUrl =
    altarRoom?.logoUrl ||
    localRoom?.logoUrl ||
    altarRoom?.organizationLogoUrl ||
    organization?.logoUrl ||
    '';
  const timezone = altarRoom?.timezone || localRoom?.timezone || 'Africa/Kampala';
  const nextStart = useMemo(() => {
    if (!roomForSchedule) return undefined;
    return getNextOccurrences(roomForSchedule, 1)[0];
  }, [roomForSchedule]);
  const scheduleLabel = joinScheduleLabel(status, nextStart, timezone);

  useEffect(() => {
    let cancelled = false;
    sanctumApi
      .getAltar(slug)
      .then((result) => {
        if (cancelled) return;
        setCanControl(result.canControl === true);
        setAltarRoom({
          id: result.room?.id,
          name: result.room?.name || '',
          organizationName: result.room?.organizationName,
          organizationLogoUrl: result.room?.organizationLogoUrl,
          logoUrl: result.room?.logoUrl,
          scheduledStart: result.room?.scheduledStart,
          timezone: result.room?.timezone,
          sermonLeaderName: typeof result.session?.sermonLeaderName === 'string' ? result.session.sermonLeaderName : undefined,
          roomSermonLeaderName: result.room?.roomSermonLeaderName,
          defaultSermonSpeaker: typeof result.room?.defaultSermonSpeaker === 'string' ? result.room.defaultSermonSpeaker : undefined,
          isRecurring: result.room?.isRecurring,
          recurrenceRule: result.room?.recurrenceRule,
          selectedDays: result.room?.selectedDays,
          oneTimeDate: result.room?.oneTimeDate,
          speakerPermission: result.room?.speakerPermission,
          allowGuests: result.room?.allowGuests,
          hasPasscode: result.room?.hasPasscode,
          prayerRequestsEnabled: result.room?.prayerRequestsEnabled,
          anonymousRequestsAllowed: result.room?.anonymousRequestsAllowed,
          chatEnabled: result.room?.chatEnabled,
        });
        const next = result.session?.status;
        setAltarStatus((next as SessionLifecycleStatus) || 'SCHEDULED');
      })
      .catch((lookupError) => {
        if (cancelled) return;
        setCanControl(false);
        setAltarStatus(lookupError instanceof ApiClientError && lookupError.status === 404 ? 'NOT_FOUND' : 'SCHEDULED');
      });
    return () => {
      cancelled = true;
    };
  }, [slug, authReady, isAuthenticated]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const joinName = joinDisplayName({
      signedIn: isAuthenticated,
      memberName,
      typedName: name,
    });
    if (!joinName) {
      setError('Please enter your name to join');
      return;
    }
    if (joinName.length < 2) {
      setError('Name must be at least 2 characters');
      return;
    }

    setIsSubmitting(true);
    try {
      if (!isAuthenticated || !memberName) {
        localStorage.setItem('sanctum_last_attendee_name', joinName);
      }
      await joinPrayerRoom(slug, joinName, { passcode: passcode.trim() || undefined });
      onJoinSuccess(joinName);
    } catch (joinError) {
      if (joinError instanceof ApiClientError && joinError.code === 'REALTIME_UNAVAILABLE') {
        setError(
          'This gathering is open, but realtime audio is unavailable. Ask the pastor to check the LiveKit server configuration.'
        );
      } else if (joinError instanceof Error && joinError.message !== 'SESSION_NOT_JOINABLE') {
        setError(joinError.message);
      } else {
        setError(
          canJoin
            ? 'Could not join this prayer gathering. Check the link and try again.'
            : 'This gathering is not open yet. Please come back when it starts.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div data-theme={sanctumTheme(isDarkMode)} className="sanctum-screen flex min-h-screen select-none flex-col justify-between p-4 transition-colors sm:p-6">
      <header className="mx-auto flex w-full max-w-md flex-col gap-3 pt-2 pb-4">
        <div className="flex items-center justify-between gap-3">
          <ChurchBadge size="md" name={churchName || 'Prayer room'} logoUrl={altarRoom?.organizationLogoUrl || organization?.logoUrl || null} />
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            className="sanctum-icon cursor-pointer rounded-xl p-2"
          >
            {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        {canControl || (isAuthenticated && onNavigate) ? (
          <div className="flex items-center justify-end gap-2">
            {canControl && altarRoom?.id ? <ControlRoomLink roomId={altarRoom.id} /> : null}
            {isAuthenticated && onNavigate ? (
              <button
                type="button"
                onClick={() => onNavigate('/dashboard')}
                className="sanctum-outline flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard</span>
              </button>
            ) : null}
          </div>
        ) : null}
      </header>

      <main className="sanctum-surface mx-auto my-auto w-full max-w-md rounded-[26px] p-6 text-center shadow-[var(--shadow-sanctum)] sm:p-8">
        {roomLogoUrl ? (
          <div className="mb-4 flex justify-center">
            <img
              src={roomLogoUrl}
              alt=""
              className="sanctum-raised h-16 w-16 rounded-2xl object-cover"
            />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-5">
          <PrayerSessionStatus status={status === 'NOT_FOUND' ? 'SCHEDULED' : status} size="md" className="sanctum-chip" />
          {isLive || isWaiting ? (
            <ParticipantCount
              count={attendeeCount}
              emptyLabel="Waiting for participants"
              className="sanctum-chip"
            />
          ) : null}
        </div>

        <p className="eyebrow mb-3">{canJoin ? 'Sanctuary open' : scheduleLabel ? `Starts ${scheduleLabel}` : 'Sanctuary'}</p>
        <h1 className="font-display text-4xl font-light tracking-tight">
          {displayName}
        </h1>

        {churchName ? (
          <p className="mt-1 text-sm font-semibold">
            {churchName}
          </p>
        ) : null}
        {sermonLeader ? (
          <p className="sanctum-muted mt-2 text-xs font-semibold">
            Sermon leader: {sermonLeader}
          </p>
        ) : null}

        {scheduleLabel ? (
          <p className="sanctum-muted mt-0.5 text-xs">
            {scheduleLabel}
          </p>
        ) : null}

        {!isLive && !isWaiting && nextStart && (
          <div className="sanctum-raised my-5 flex flex-col items-center gap-1.5 rounded-2xl p-4">
            <span className="sanctum-muted flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider">
              <Clock className="h-3.5 w-3.5" />
              Prayer Begins In
            </span>
            <PrayerCountdown
              targetDate={nextStart}
            />
          </div>
        )}

        <div className="sanctum-raised my-4 rounded-2xl p-3.5">
          <p className="text-xs font-medium leading-relaxed">
            {isWaiting
              ? 'The Sanctuary is Open. You will join as a listener — your microphone stays off unless a prayer leader invites you to speak.'
              : canJoin
                ? (altarRoom?.speakerPermission || localRoom?.speakerPermission) === 'PRAYER_LEADERS'
                  ? 'Join as a listener. Only prayer leaders speak in this room.'
                  : 'Join as a listener. Raise your hand if you would like to pray aloud.'
                : scheduleLabel
                  ? `This gathering is not open yet. It starts ${scheduleLabel}. Keep this page and come back then.`
                  : 'This gathering is not open yet. Keep this page and come back when it starts.'}
          </p>
        </div>

        {altarRoom?.allowGuests === false && !isAuthenticated ? (
          <div className="space-y-3 text-left">
            <p className="text-xs">
              This room does not allow guests. Sign in with your church account to join.
            </p>
            <button
              type="button"
              onClick={() => onNavigate?.('/login')}
              className="sanctum-accent w-full cursor-pointer rounded-2xl py-3 text-sm font-bold"
            >
              Sign in
            </button>
          </div>
        ) : (
        <form onSubmit={handleJoin} className="space-y-4 text-left">
          {error && (
            <div className="sanctum-danger rounded-xl p-3 text-xs font-medium">
              {error}
            </div>
          )}

          <div data-tour="join-name">
            <label
              htmlFor="attendeeName"
              className="mb-2 block text-sm font-semibold"
            >
              Your name
            </label>
            <input
              id="attendeeName"
              type="text"
              required
              autoFocus
              value={isAuthenticated && memberName ? memberName : name}
              readOnly={Boolean(isAuthenticated && memberName)}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="The name people know you by"
              aria-describedby="attendeeNameHint"
              className="sanctum-input w-full rounded-full px-4 py-3.5 text-base font-medium focus:outline-none"
            />
            <p id="attendeeNameHint" className="sanctum-muted mt-2 text-xs">
              Type the name people know you by, then tap Enter the sanctuary. No account needed.
            </p>
          </div>

          {altarRoom?.hasPasscode && (
            <div>
              <label htmlFor="room-passcode" className="mb-2 block text-xs font-bold uppercase tracking-wider">
                Room passcode
              </label>
              <input
                id="room-passcode"
                type="password"
                autoComplete="current-password"
                value={passcode}
                onChange={(event) => setPasscode(event.target.value)}
                className="sanctum-input w-full rounded-full px-4 py-3.5 text-base font-medium focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !canJoin}
            className="sanctum-accent flex w-full cursor-pointer items-center justify-center gap-2 rounded-full px-6 py-4 text-lg font-semibold shadow-[var(--shadow-glow)] disabled:cursor-not-allowed"
          >
            <Sparkles className="h-5 w-5" />
            <span>Enter the sanctuary</span>
          </button>
        </form>
        )}

        <div className="mt-6 space-y-2 border-t pt-5" style={{ borderColor: 'var(--border)' }}>
          <div className="sanctum-muted flex items-center justify-center gap-1.5 text-xs">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>{altarRoom?.allowGuests === false ? 'Church account required.' : 'No account required.'}</span>
          </div>
          <p className="sanctum-muted text-[11px] leading-relaxed">
            Your microphone stays off unless a prayer leader invites you to speak.
          </p>
        </div>
      </main>

      <footer className="sanctum-muted mx-auto w-full max-w-md pb-2 pt-6 text-center text-xs">
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <button
            type="button"
            onClick={() => setShowHelpModal(true)}
            className="inline-flex cursor-pointer items-center gap-1 underline"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Connection Help
          </button>

          <span>•</span>

          <div className="inline-flex items-center gap-1.5">
            <span>Data Saver:</span>
            <select
              aria-label="Data Saver Mode"
              value={dataSaverMode}
              onChange={(e) => setDataSaverMode(e.target.value as any)}
              className="cursor-pointer border-none bg-transparent text-xs font-semibold focus:outline-none"
            >
              <option value="AUTOMATIC">Auto</option>
              <option value="ON">On (Save Data)</option>
              <option value="OFF">Off</option>
            </select>
          </div>

          <span>•</span>

          <a href="/privacy" className="underline">
            Privacy
          </a>
        </div>
      </footer>

      {showHelpModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="sanctum-surface w-full max-w-sm rounded-3xl p-6 text-left shadow-[var(--shadow-sanctum)]">
            <h3 className="mb-2 text-lg font-bold">
              Joining & Connection Help
            </h3>
            <div className="sanctum-muted space-y-2.5 text-xs leading-relaxed">
              <p>
                <strong>No Login Needed:</strong> Congregants enter a name and tap Enter the sanctuary. You join as a listener.
              </p>
              <p>
                <strong>Microphone:</strong> Your mic stays off. If a prayer leader invites you to speak, Accept and the browser will ask for microphone permission.
              </p>
              <p>
                <strong>Pastors:</strong> Lead from the dashboard Control Room, not this join page. That is where the host microphone lives.
              </p>
              <p>
                <strong>Hearing prayer audio:</strong> If you don't hear sound once the live gathering begins, check that your phone volume or device speaker is turned up.
              </p>
            </div>
            <div className="mt-4 flex justify-end border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              <button
                type="button"
                onClick={() => setShowHelpModal(false)}
                className="sanctum-accent rounded-xl px-4 py-2 text-xs font-medium"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
