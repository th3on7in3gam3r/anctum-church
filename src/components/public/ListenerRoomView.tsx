import React, { useEffect, useState } from 'react';
import { loadJoinSession } from '../../services/realtime/joinSessionStore';
import { ChurchBadge } from '../common/ChurchBadge';
import { sanctumTheme } from './ChurchWordmark';
import { churchSiteUrl } from '../../lib/appMode';
import { LiveBadge } from '../common/LiveBadge';
import { ConnectionStatus } from '../common/ConnectionStatus';
import { ParticipantCount } from '../common/ParticipantCount';
import { PrayerTimer } from '../common/PrayerTimer';
import { AudioVisualizerPlaceholder } from '../common/AudioVisualizerPlaceholder';
import { ListenerReactionBar } from './ListenerReactionBar';
import { PrayerRequestModal } from './PrayerRequestModal';
import { InvitedSpeakerBanner } from './InvitedSpeakerBanner';
import { PrayerChatPanel } from './PrayerChatPanel';
import { SpeakerLiveView } from './SpeakerLiveView';
import { PostPrayerSummaryView } from './PostPrayerSummaryView';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { isClientMinister } from '../../lib/permissions';
import { LogOut, Sun, Moon, Volume2, LayoutDashboard, Mic, MicOff, CircleHelp } from 'lucide-react';
import { DevelopmentPreviewBadge } from '../common/DevelopmentPreviewBadge';
import { RealtimeEngineStatus } from '../common/RealtimeEngineStatus';
import { LocalMicStatus } from '../common/LocalMicStatus';
import { sanctumApi } from '../../services/api/sanctumApi';
import { livekitRealtimeProvider } from '../../services/realtime/livekitRealtimeProvider';
import { connectionStateToQuality } from '../../services/domain/sessionSnapshot';
import { useTour } from '../../hooks/useTour';
import { TOUR_IDS } from '../../tour/tourIds';
import { listenerRoomTourSteps } from '../../tour/listenerRoomTour';
import { ControlRoomLink } from './ControlRoomLink';
import { resolveSermonLeader } from '../../../shared/joinDisplay.ts';

interface ListenerRoomViewProps {
  participantName: string;
  roomSlug: string;
  onLeave: () => void;
}

export const ListenerRoomView: React.FC<ListenerRoomViewProps> = ({
  participantName,
  roomSlug,
  onLeave,
}) => {
  const {
    liveSession,
    prayerRooms,
    raiseHandAttendee,
    lowerHandAttendee,
    sendReactionAttendee,
    isDarkMode,
    toggleDarkMode,
    connectionState,
    connectedNow,
    audioBlocked,
    localParticipantId,
    pendingSpeakerInvite,
    prayerComplete,
    enablePrayerAudio,
    reconnectToPrayer,
    acceptSpeakerInvite,
    declineSpeakerInvite,
    endSpeaker,
    participants,
    addToast,
    startPtt,
    endPtt,
  } = useApp();
  const { isAuthenticated, authReady, user, organization } = useAuth();

  const [isHandRaised, setIsHandRaised] = useState(false);
  const [isPrayerRequestOpen, setIsPrayerRequestOpen] = useState(false);
  const [canControl, setCanControl] = useState(false);
  const [altarFlags, setAltarFlags] = useState<{
    id?: string;
    name?: string;
    roomSermonLeaderName?: string;
    defaultSermonSpeaker?: string;
    speakerPermission?: string;
    prayerRequestsEnabled?: boolean;
    anonymousRequestsAllowed?: boolean;
    chatEnabled?: boolean;
  } | null>(null);
  const [selfMuted, setSelfMuted] = useState(false);
  const [micOn, setMicOn] = useState(false);
  const [pttActive, setPttActive] = useState(false);
  const { startTour } = useTour(TOUR_IDS.listenerRoom, listenerRoomTourSteps, { delayMs: 900 });

  useEffect(() => {
    const stored = loadJoinSession();
    if (!stored) return;
    if (user?.id && stored.asGuest) {
      void reconnectToPrayer({ silent: true });
      return;
    }
    if (connectionState !== 'DISCONNECTED' && connectionState !== 'FAILED') return;
    void reconnectToPrayer({ silent: true });
  }, [user?.id]);

  useEffect(() => {
    const onOnline = () => {
      void reconnectToPrayer({ silent: true });
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [reconnectToPrayer]);

  const matchedRoom =
    prayerRooms.find((item) => item.slug === roomSlug) ||
    prayerRooms.find((item) => item.id === liveSession?.prayerRoomId);
  const room = matchedRoom || prayerRooms[0];
  const leadersOnly = (matchedRoom?.speakerPermission || altarFlags?.speakerPermission) === 'PRAYER_LEADERS';
  const prayerRequestsOn = (matchedRoom?.prayerRequestsEnabled ?? altarFlags?.prayerRequestsEnabled) !== false;
  const anonymousRequestsOn = (matchedRoom?.anonymousRequestsAllowed ?? altarFlags?.anonymousRequestsAllowed) !== false;
  const chatOn = (matchedRoom?.chatEnabled ?? altarFlags?.chatEnabled) !== false;

  useEffect(() => {
    let cancelled = false;
    sanctumApi
      .getAltar(roomSlug)
      .then((result) => {
        if (!cancelled) {
          setCanControl(result.canControl === true);
          setAltarFlags(result.room);
        }
      })
      .catch(() => {
        if (!cancelled) setCanControl(false);
      });
    return () => {
      cancelled = true;
    };
  }, [roomSlug, authReady, isAuthenticated]);
  const liveConnected = connectionState === 'CONNECTED' || connectionState === 'RECONNECTING';
  const localParticipant = participants.find((item) => item.id === localParticipantId);
  const currentRole = localParticipant?.role === 'SPEAKER' ? 'SPEAKER' : 'LISTENER';
  const isInvitedSpeaker = currentRole === 'SPEAKER';
  const isMinister = isClientMinister(localParticipant?.role) || isClientMinister(user?.role);
  const congregationMuted = liveSession?.congregationMuted !== false;
  const canDiscuss = !congregationMuted && !isMinister;
  const privateWithMe =
    Boolean(liveSession?.privatePrayer) &&
    liveSession?.privatePrayer?.memberParticipantId === localParticipantId;
  const canUseMic = isMinister || isInvitedSpeaker || canDiscuss || privateWithMe;
  const showLiveMic = micOn && canUseMic;
  const prayerHasStarted = liveSession?.status === 'LIVE' || liveSession?.status === 'STARTING';
  const participantCount = liveConnected || localParticipantId ? connectedNow : undefined;
  const gatheringName = altarFlags?.name?.trim() || matchedRoom?.name || liveSession?.roomName || 'Prayer gathering';
  const sermonLeader = resolveSermonLeader(
    liveSession?.sermonLeaderName,
    altarFlags?.roomSermonLeaderName,
    altarFlags?.defaultSermonSpeaker
  );
  const floorHeld = Boolean(
    (liveSession?.activeSpeakerName || '').trim() ||
      liveSession?.pttParticipantId ||
      privateWithMe ||
      (showLiveMic && (isMinister || isInvitedSpeaker))
  );

  useEffect(() => {
    setIsHandRaised(Boolean(localParticipant?.isHandRaised));
  }, [localParticipant?.isHandRaised]);

  useEffect(() => {
    const syncLocalMic = () => {
      const status = livekitRealtimeProvider.getLocalMicStatus();
      setMicOn(status.publishing && !status.muted);
      setSelfMuted(!status.publishing || status.muted);
    };
    syncLocalMic();
    const unsubscribe = livekitRealtimeProvider.subscribe(syncLocalMic);
    const timer = window.setInterval(syncLocalMic, 1000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [liveConnected]);

  useEffect(() => {
    if (!congregationMuted || isMinister || isInvitedSpeaker || privateWithMe) return;
    if (pttActive && localParticipantId) {
      setPttActive(false);
      void endPtt(localParticipantId);
    }
    if (micOn) {
      void livekitRealtimeProvider.disableMicrophone();
      setMicOn(false);
      setSelfMuted(true);
    }
  }, [congregationMuted, isMinister, isInvitedSpeaker, privateWithMe, pttActive, micOn, localParticipantId, endPtt]);

  const prevCongregationMuted = React.useRef(congregationMuted);
  useEffect(() => {
    const wasMuted = prevCongregationMuted.current;
    prevCongregationMuted.current = congregationMuted;
    if (wasMuted && !congregationMuted && !isMinister) {
      addToast('The floor is open. Hold to speak.', 'success');
    }
    if (!wasMuted && congregationMuted && !isMinister) {
      addToast('Sermon mode — congregation microphones are locked again.', 'info');
    }
  }, [congregationMuted, isMinister, addToast]);

  const handleTogglePtt = async () => {
    if (!localParticipantId || !canDiscuss || privateWithMe) return;
    if (pttActive) {
      setPttActive(false);
      await endPtt(localParticipantId);
      return;
    }
    try {
      await startPtt(localParticipantId);
      setPttActive(true);
    } catch {
      setPttActive(false);
    }
  };
  useEffect(() => {
    return livekitRealtimeProvider.subscribe((event) => {
      if (event.type !== 'PARTICIPANT_MUTED') return;
      if (event.metadata?.muted === false) return;
      if (!event.participantId || event.participantId !== localParticipantId) return;
      setMicOn(false);
      setSelfMuted(true);
      setPttActive(false);
    });
  }, [localParticipantId]);

  const handleToggleRaiseHand = async () => {
    if (!localParticipantId) return;
    if (isHandRaised) {
      await lowerHandAttendee(localParticipantId);
      setIsHandRaised(false);
    } else {
      const raised = await raiseHandAttendee(localParticipantId, participantName);
      setIsHandRaised(raised);
    }
  };

  const handleFinishPrayer = async () => {
    if (localParticipantId && currentRole === 'SPEAKER') {
      await endSpeaker(localParticipantId);
    }
    try {
      await livekitRealtimeProvider.disableMicrophone();
    } catch {
      /* already muted or disconnected */
    }
    setMicOn(false);
    setSelfMuted(true);
  };

  const handleToggleLeadMic = async () => {
    try {
      if (micOn) {
        await livekitRealtimeProvider.disableMicrophone();
        setMicOn(false);
        setSelfMuted(true);
        return;
      }
      await livekitRealtimeProvider.enableMicrophone();
      setMicOn(true);
      setSelfMuted(false);
    } catch {
      setMicOn(false);
      setSelfMuted(true);
      addToast(
        isMinister || isInvitedSpeaker
          ? 'Allow microphone access in the browser to lead in prayer.'
          : 'Allow microphone access in the browser to join the discussion.',
        'error'
      );
    }
  };

  if (prayerComplete || liveSession?.status === 'ENDED') {
    return (
      <PostPrayerSummaryView
        room={room}
        session={liveSession}
        participantName={participantName}
        onExit={onLeave}
      />
    );
  }

  return (
    <div data-theme={sanctumTheme(isDarkMode)} className="sanctum-screen flex min-h-screen select-none flex-col justify-between p-4 transition-colors sm:p-6">
      <header className="mx-auto flex w-full max-w-3xl flex-col gap-3 pb-4">
        <div className="flex items-center justify-between gap-3">
        <ChurchBadge size="sm" name={organization?.name || 'Prayer room'} logoUrl={organization?.logoUrl || null} className="min-w-0" />

        <div className="flex items-center gap-2 sm:gap-3">
          <LocalMicStatus locked={!canUseMic} compact className="sanctum-chip" />
          <ConnectionStatus
            status={connectionStateToQuality(connectionState)}
            showLabel={false}
            preview={!liveConnected}
            live={liveConnected}
            className="sanctum-chip"
          />
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            className="sanctum-icon cursor-pointer rounded-xl p-2"
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={() => startTour()}
            aria-label="Show prayer room tutorial"
            className="sanctum-icon cursor-pointer rounded-xl p-2"
          >
            <CircleHelp className="h-4 w-4" />
          </button>
          <button
            onClick={onLeave}
            aria-label={isAuthenticated ? 'Back to dashboard' : 'Leave prayer session'}
            data-tour="listener-leave"
            className="sanctum-outline flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            {isAuthenticated ? <LayoutDashboard className="w-3.5 h-3.5" /> : <LogOut className="w-3.5 h-3.5" />}
            <span>{isAuthenticated ? 'Dashboard' : 'Leave'}</span>
          </button>
        </div>
        </div>
        {canControl && altarFlags?.id ? (
          <div className="flex justify-end">
            <ControlRoomLink roomId={altarFlags.id} />
          </div>
        ) : null}
      </header>

      <main className="w-full max-w-2xl mx-auto my-auto py-4 sm:py-6 space-y-6">
        {connectionState === 'RECONNECTING' && (
          <div className="sanctum-chip rounded-full px-3 py-2 text-center text-sm font-semibold">
            Reconnecting…
          </div>
        )}
        {(connectionState === 'FAILED' || connectionState === 'DISCONNECTED') &&
          (localParticipantId || loadJoinSession()) && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => void reconnectToPrayer()}
              className="sanctum-accent cursor-pointer rounded-xl px-4 py-2 text-xs font-bold"
            >
              Reconnect
            </button>
          </div>
        )}
        {audioBlocked && (
          <div className="text-center">
            <button
              type="button"
              onClick={() => void enablePrayerAudio()}
              data-tour="listener-enable-audio"
              className="sanctum-outline inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold"
            >
              <Volume2 className="w-4 h-4" />
              Enable Prayer Audio
            </button>
          </div>
        )}

        <div
          className="sanctum-surface flex flex-col justify-between gap-3 rounded-2xl p-4 text-center sm:flex-row sm:items-center sm:text-left"
          data-tour="listener-welcome"
        >
          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
              {prayerHasStarted ? <LiveBadge size="sm" className="sanctum-chip" /> : null}
              <h1 className="text-lg font-bold sm:text-xl">
                {gatheringName}
              </h1>
            </div>
            {sermonLeader && (
              <p className="text-xs font-semibold">
                Sermon leader: {sermonLeader}
              </p>
            )}
            <p className="sanctum-muted text-xs">
              {privateWithMe
                ? 'Pastor is praying with you privately — only you two can hear each other.'
                  : isMinister || isInvitedSpeaker
                  ? showLiveMic
                    ? <>You are leading: <span className="font-semibold">{participantName}</span></>
                      : isInvitedSpeaker
                        ? 'You are invited to speak. Accept the invitation to turn on your microphone.'
                        : 'You are a minister. Turn on your microphone to speak.'
                  : congregationMuted
                    ? sermonLeader
                      ? `Sermon — the congregation is muted. You will hear ${sermonLeader} and ministers.`
                      : 'Sermon — the congregation is muted. You will hear the ministers.'
                    : pttActive || showLiveMic
                      ? 'You are speaking. Tap again to stop.'
                      : 'The floor is open. Hold to speak.'}
            </p>
            {!isMinister && !isInvitedSpeaker && (
              <p
                className="sanctum-chip mt-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
              >
                {privateWithMe ? (
                  <>Private prayer</>
                ) : (
                  <>
                    {congregationMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
                    {congregationMuted ? 'Sermon mode' : 'Floor open'}
                  </>
                )}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center sm:justify-end gap-3 flex-wrap">
            <ParticipantCount
              count={participantCount}
              className="sanctum-chip"
              suffix="praying with you"
              size="sm"
              emptyLabel="Waiting for participants"
              localParticipantId={localParticipantId}
              names={participants
                .filter((person) => !person.leftAt)
                .map((person) => ({
                  id: person.id,
                  displayName: person.displayName,
                  role: person.role,
                }))}
            />
            <PrayerTimer seconds={liveSession?.durationSeconds || 0} size="sm" />
          </div>
        </div>

        {privateWithMe && (
          <div className="sanctum-raised w-full space-y-1 rounded-2xl px-4 py-4 text-center">
            <p className="text-sm font-bold">Private prayer with your pastor</p>
            <p className="sanctum-muted text-xs">
              Only you and the host can hear this exchange. Speak normally — your mic is open for this private moment.
            </p>
          </div>
        )}

        {(isMinister || isInvitedSpeaker) && canUseMic && (
          <button
            type="button"
            onClick={() => void handleToggleLeadMic()}
            data-tour="listener-mic"
            className={`w-full py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 cursor-pointer ${
              showLiveMic && !selfMuted
                ? 'sanctum-danger'
                : 'sanctum-accent'
            }`}
          >
            {showLiveMic && !selfMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            <span>{showLiveMic && !selfMuted ? 'Mute microphone' : 'Unmute microphone to lead'}</span>
          </button>
        )}

        {canDiscuss && !privateWithMe && (
          <button
            type="button"
            data-tour="listener-mic"
            onClick={() => void handleTogglePtt()}
            className={`w-full py-6 px-4 rounded-2xl font-bold text-base flex items-center justify-center gap-2 cursor-pointer ${
              pttActive
                ? 'sanctum-accent scale-[0.98]'
                : 'sanctum-accent'
            }`}
          >
            <Mic className="w-5 h-5" />
            <span>{pttActive ? 'Speaking… tap again to stop' : 'Hold to speak'}</span>
          </button>
        )}

        {!canUseMic && (
          <div
            data-tour="listener-mic-locked"
            className="sanctum-chip flex w-full items-center justify-center gap-2 rounded-full px-4 py-3 text-center text-xs font-medium"
          >
            <MicOff className="h-4 w-4 shrink-0" />
            Your microphone stays off until the pastor opens the floor for prayer.
          </div>
        )}

        {showLiveMic && (isMinister || isInvitedSpeaker) ? (
          <SpeakerLiveView
            participantName={participantName}
            participantCount={participantCount}
            selfMuted={selfMuted}
            onToggleSelfMute={() => void handleToggleLeadMic()}
            onFinishPrayer={handleFinishPrayer}
          />
        ) : (
          <div className="space-y-3">
            <AudioVisualizerPlaceholder
              eyebrow={floorHeld ? 'Currently speaking' : 'Waiting'}
              speakerName={
                floorHeld
                  ? liveSession?.activeSpeakerName?.trim() || (isMinister ? participantName : 'Prayer leader')
                  : 'Waiting for the next prayer leader.'
              }
              speakerTitle={
                privateWithMe
                  ? 'Private prayer — only you and the host hear this.'
                  : isMinister
                    ? 'Turn on your microphone. The congregation is waiting to hear you.'
                    : congregationMuted
                      ? sermonLeader
                        ? `Sermon mode — listen as ${sermonLeader} leads.`
                        : 'Sermon mode — the congregation is listening.'
                      : 'The floor is open. Hold to speak.'
              }
              isLive={prayerHasStarted}
            />
          </div>
        )}

        {!showLiveMic && (
          <div data-tour="listener-reactions">
            <ListenerReactionBar
              isHandRaised={isHandRaised}
              onSendAmen={() => sendReactionAttendee('AMEN')}
              onSendPraiseGod={() => sendReactionAttendee('PRAISE_GOD')}
              onToggleRaiseHand={handleToggleRaiseHand}
              onOpenPrayerRequest={() => setIsPrayerRequestOpen(true)}
              showRaiseHand={!leadersOnly}
              showPrayerRequest={prayerRequestsOn}
            />
          </div>
        )}

        <div data-tour="listener-chat">
          {chatOn && (
          <PrayerChatPanel
            sessionId={liveSession?.id || loadJoinSession()?.sessionId}
            senderName={participantName}
            compact
          />
          )}
        </div>
      </main>

      <p className="sanctum-muted mx-auto w-full max-w-2xl text-center text-[11px] leading-relaxed">
        Keep listening while you browse —{' '}
        <a
          href="https://github.com/th3on7in3gam3r/sanctum-live/blob/main/extension/README.md"
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold underline"
        >
          install the Sanctum Live side panel
        </a>
        .
      </p>

      <footer className="sanctum-muted mx-auto flex w-full max-w-2xl items-center justify-between border-t pt-4 text-center text-xs" style={{ borderColor: 'var(--border)' }}>
        <span className="text-[11px]">Sanctum Live™ — Prayer without barriers</span>
        <span className="text-[11px] inline-flex items-center gap-2">
          <RealtimeEngineStatus />
          {!liveConnected ? <DevelopmentPreviewBadge /> : <span>Media Engine Connected</span>}
        </span>
      </footer>

      <PrayerRequestModal
        isOpen={isPrayerRequestOpen && prayerRequestsOn}
        onClose={() => setIsPrayerRequestOpen(false)}
        defaultName={participantName}
        roomName={liveSession?.roomName}
        allowAnonymous={anonymousRequestsOn}
      />

      <InvitedSpeakerBanner
        isOpen={Boolean(pendingSpeakerInvite)}
        onAccept={() => void acceptSpeakerInvite()}
        onDecline={() => void declineSpeakerInvite()}
        canAccept={liveSession?.status === 'LIVE'}
      />
    </div>
  );
};
