import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import {
  PrayerRoom,
  PrayerSession,
  Participant,
  RaisedHand,
  PrayerRequest,
  DataSaverMode,
  Role,
  ToastItem,
  ToastType,
  ConfirmActionOptions,
} from '../types';
import { isDemoHistoryId, isDemoRequestId, isDemoRoomId } from '../lib/demoRecords';
import { generateRollingSessions } from '../services/sessionScheduler';
import { AuditLogger } from '../services/auditLogger';
import { localPersistenceAdapter } from '../services/persistence/localPersistenceAdapter';
import { sessionApiAdapter } from '../services/domain/sessionApiAdapter';
import { ApiClientError, sanctumApi } from '../services/api/sanctumApi';
import { livekitRealtimeProvider } from '../services/realtime/livekitRealtimeProvider';
import { saveJoinSession, loadJoinSession, clearJoinSession } from '../services/realtime/joinSessionStore';
import { useAuth } from './AuthContext';
import type { ConnectionState } from '../types';
import {
  connectionStateToQuality,
  isServerSessionId,
  mapServerPrayerRoom,
  mapServerSession,
  mapSnapshotHands,
  mapSnapshotParticipants,
} from '../services/domain/sessionSnapshot';
import { resolveSermonLeader } from '../../shared/joinDisplay.ts';

export type Toast = ToastItem;

export interface AppContextType {
  prayerRooms: PrayerRoom[];
  prayerSessions: PrayerSession[];
  historySessions: PrayerSession[];
  liveSession: PrayerSession | null;
  participants: Participant[];
  raisedHands: RaisedHand[];
  prayerRequests: PrayerRequest[];
  dataSaverMode: DataSaverMode;
  isDarkMode: boolean;
  toasts: ToastItem[];
  confirmModalConfig: ConfirmActionOptions | null;
  hasUnsavedChanges: boolean;
  setHasUnsavedChanges: (dirty: boolean) => void;
  
  // Theme & Settings
  toggleDarkMode: () => void;
  setDataSaverMode: (mode: DataSaverMode) => void;
  addToast: (
    toastOrMessage: string | Omit<ToastItem, 'id'>,
    type?: ToastType,
    title?: string
  ) => void;
  removeToast: (id: string) => void;

  // Confirmation Modal
  confirmAction: (options: ConfirmActionOptions) => void;
  closeConfirmModal: () => void;

  // Prayer Room operations
  createPrayerRoom: (
    data: Omit<PrayerRoom, 'id' | 'createdAt' | 'updatedAt'> & { passcode?: string | null }
  ) => Promise<PrayerRoom>;
  updatePrayerRoom: (id: string, updates: Partial<PrayerRoom> & { passcode?: string | null }) => Promise<PrayerRoom>;
  deletePrayerRoom: (id: string) => Promise<void>;
  setCongregationMuted: (muted: boolean) => Promise<void>;
  startPtt: (participantId: string) => Promise<void>;
  endPtt: (participantId: string) => Promise<void>;
  startPrivatePrayer: (memberParticipantId: string) => Promise<void>;
  endPrivatePrayer: () => Promise<void>;

  // Session Lifecycle Machine
  openSanctuary: (roomId: string, sermonLeaderName: string) => Promise<void>;
  startPrayerSession: (roomId: string, sermonLeaderName?: string) => Promise<void>;
  endPrayerSession: (sessionIdOrAdminId?: string, adminId?: string) => Promise<void>;
  cancelPrayerSession: (sessionId: string) => void;
  startLiveSession: (roomId: string) => void;
  endLiveSession: (sessionIdOrAdminId?: string, adminId?: string) => Promise<void>;

  // Control room & Moderation operations
  inviteToPray: (participantId: string, adminId?: string) => Promise<void>;
  inviteSpeaker: (participantId: string, adminId?: string) => Promise<void>;
  dismissHand: (raisedHandId: string) => void;
  dismissRaisedHand: (raisedHandId: string) => void;
  muteSpeaker: (participantId: string, adminId?: string) => Promise<void>;
  muteParticipant: (participantId: string, adminId?: string) => Promise<void>;
  unmuteParticipant: (participantId: string) => Promise<void>;
  endSpeaker: (participantId: string, adminId?: string) => Promise<void>;
  removeParticipant: (participantId: string, adminId?: string) => Promise<void>;
  updateParticipantRole: (participantId: string, newRole: Role, adminId?: string) => Promise<void>;
  assignRole: (participantId: string, newRole: Role, adminId?: string) => Promise<void>;

  // Public / Attendee actions
  joinPrayerRoom: (roomSlug: string, name: string, options?: { passcode?: string }) => Promise<{ participantId: string; role: Role }>;
  raiseHandAttendee: (participantId: string, name: string) => Promise<boolean>;
  lowerHandAttendee: (participantId: string) => Promise<void>;
  sendReactionAttendee: (emoji: 'AMEN' | 'PRAISE_GOD') => void;
  submitPrayerRequest: (data: { request: string; isPrivate: boolean; participantName: string; roomName?: string }) => void;
  
  // Prayer Request management
  markPrayerRequestAnswered: (id: string, note?: string) => void;
  archivePrayerRequest: (id: string) => void;
  addPrayerRequestNote: (id: string, note: string) => void;
  addNoteToPrayerRequest: (id: string, note: string) => void;

  // Simulation helpers for testing
  simulateParticipantJoin: (name?: string) => void;
  simulateIncomingPrayerRequest: (customRequest?: string) => void;
  connectionState: ConnectionState;
  connectedNow: number;
  audioBlocked: boolean;
  localParticipantId: string | null;
  pendingSpeakerInvite: { invitationId?: string; participantId: string } | null;
  prayerComplete: boolean;
  enablePrayerAudio: () => Promise<void>;
  reconnectToPrayer: (opts?: { silent?: boolean }) => Promise<void>;
  acceptSpeakerInvite: () => Promise<void>;
  declineSpeakerInvite: () => Promise<void>;
  connectControlRoom: (roomId: string) => Promise<void>;
  leavePrayerRoom: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function storedList<T>(load: () => unknown): T[] {
  try {
    const value = load();
    return Array.isArray(value) ? value : [];
  } catch (error) {
    console.error(error);
    return [];
  }
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, organization } = useAuth();
  const actor = { userId: user?.id, organizationId: organization?.id };
  /**
   * Enforces org-scoped Permanent Altar Link uniqueness in the prototype store.
   * Future database constraint (already in prisma/schema.prisma):
   *   @@unique([organizationId, slug])
   */
  const isSlugTaken = (
    rooms: PrayerRoom[],
    organizationId: string,
    slug: string,
    excludeRoomId?: string
  ) => {
    const normalized = slug.toLowerCase().trim();
    return rooms.some(
      (room) =>
        room.organizationId === organizationId &&
        room.id !== excludeRoomId &&
        (room.slug || '').toLowerCase().trim() === normalized
    );
  };

  const dedupePrayerRooms = (rooms: PrayerRoom[]): PrayerRoom[] => {
    const sorted = [...rooms].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    const seen = new Map<string, PrayerRoom>();
    for (const room of sorted) {
      const key = `${room.organizationId}::${(room.slug || '').toLowerCase().trim()}`;
      if (!seen.has(key)) {
        seen.set(key, room);
      }
    }
    return Array.from(seen.values());
  };

  const [prayerRooms, setPrayerRooms] = useState<PrayerRoom[]>(() => {
    const parsed = storedList<PrayerRoom>(() => localPersistenceAdapter.loadRooms([]));
    return dedupePrayerRooms(parsed.filter((room) => room && !isDemoRoomId(room.id)));
  });

  const [historySessions, setHistorySessions] = useState<PrayerSession[]>(() => {
    return storedList<PrayerSession>(() => localPersistenceAdapter.loadHistory([])).filter(
      (session) => session && !isDemoHistoryId(session.id) && !isDemoRoomId(session.prayerRoomId)
    );
  });

  const [liveSession, setLiveSession] = useState<PrayerSession | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [raisedHands, setRaisedHands] = useState<RaisedHand[]>([]);
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>(() => {
    return storedList<PrayerRequest>(() => localPersistenceAdapter.loadRequests([])).filter(
      (request) => request && !isDemoRequestId(request.id)
    );
  });

  // Rolling scheduled sessions
  const [scheduledSessions, setScheduledSessions] = useState<PrayerSession[]>(() => {
    try {
      return generateRollingSessions(prayerRooms, historySessions);
    } catch (error) {
      console.error(error);
      return [];
    }
  });

  const [dataSaverMode, setDataSaverModeState] = useState<DataSaverMode>(() => {
    return (localPersistenceAdapter.loadDataSaver('AUTOMATIC') as DataSaverMode) || 'AUTOMATIC';
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => localPersistenceAdapter.loadTheme());

  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmModalConfig, setConfirmModalConfig] = useState<ConfirmActionOptions | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Concurrency guard to prevent duplicate actions
  const isMutatingRef = useRef(false);
  const liveSessionIdRef = useRef<string | null>(null);
  const localParticipantIdRef = useRef<string | null>(null);
  const connectedRoomRef = useRef<string | null>(null);

  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [connectedNow, setConnectedNow] = useState(0);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [localParticipantId, setLocalParticipantId] = useState<string | null>(null);
  const [pendingSpeakerInvite, setPendingSpeakerInvite] = useState<{
    invitationId?: string;
    participantId: string;
  } | null>(null);
  const [prayerComplete, setPrayerComplete] = useState(false);

  // Prototype shell persistence adapter (not the production database).
  useEffect(() => {
    localPersistenceAdapter.saveRooms(prayerRooms);
  }, [prayerRooms]);

  useEffect(() => {
    localPersistenceAdapter.saveHistory(historySessions);
  }, [historySessions]);

  useEffect(() => {
    localPersistenceAdapter.saveRequests(prayerRequests);
  }, [prayerRequests]);

  useEffect(() => {
    setScheduledSessions(generateRollingSessions(prayerRooms, historySessions));
  }, [prayerRooms, historySessions]);

  useEffect(() => {
    const orgId = organization?.id;
    if (!orgId || !user?.id) return;

    setPrayerRooms((prev) =>
      dedupePrayerRooms(prev.filter((room) => room.organizationId === orgId && !isDemoRoomId(room.id)))
    );
    setHistorySessions((prev) =>
      prev.filter((session) => !isDemoHistoryId(session.id) && !isDemoRoomId(session.prayerRoomId))
    );
    setPrayerRequests((prev) => prev.filter((request) => !isDemoRequestId(request.id)));

    let cancelled = false;
    void (async () => {
      try {
        const result = await sanctumApi.listPrayerRooms({ userId: user.id, organizationId: orgId });
        if (cancelled) return;
        const mapped = result.rooms.map(mapServerPrayerRoom).filter((room) => !isDemoRoomId(room.id));
        setPrayerRooms((prev) => {
          const fromOtherOrgs = prev.filter((room) => room.organizationId !== orgId && !isDemoRoomId(room.id));
          return dedupePrayerRooms([...mapped, ...fromOtherOrgs]);
        });
      } catch {
        /* keep local rooms for this church */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [organization?.id, user?.id]);

  useEffect(() => {
    localPersistenceAdapter.saveDataSaver(dataSaverMode);
  }, [dataSaverMode]);

  useEffect(() => {
    localPersistenceAdapter.saveTheme(isDarkMode);
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Session elapsed timer ticker
  useEffect(() => {
    if (!liveSession || liveSession.status !== 'LIVE') return;
    const interval = setInterval(() => {
      setLiveSession((prev) => {
        if (!prev || prev.status !== 'LIVE') return prev;
        return {
          ...prev,
          durationSeconds: prev.durationSeconds + 1,
          speakerDurationSeconds: (prev.speakerDurationSeconds || 0) + 1,
        };
      });

      // Update raised hand waiting seconds
      setRaisedHands((prev) =>
        prev.map((rh) => ({
          ...rh,
          waitingSeconds: rh.waitingSeconds + 1,
        }))
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [liveSession?.status]);

  useEffect(() => {
    liveSessionIdRef.current = liveSession && isServerSessionId(liveSession.id) ? liveSession.id : null;
  }, [liveSession?.id]);

  useEffect(() => {
    localParticipantIdRef.current = localParticipantId;
  }, [localParticipantId]);

  const addToast = useCallback(
    (
      toastOrMessage: string | Omit<ToastItem, 'id'>,
      type: ToastType = 'info',
      title?: string
    ) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
      const timeStr = new Intl.DateTimeFormat('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      }).format(new Date());

      if (typeof toastOrMessage === 'string') {
        const newToast: ToastItem = {
          id,
          type,
          title: title || (type === 'error' ? 'Error' : type === 'warning' ? 'Notice' : 'Update'),
          message: toastOrMessage,
          timestamp: timeStr,
        };
        setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
      } else {
        const newToast: ToastItem = {
          ...toastOrMessage,
          id,
          timestamp: toastOrMessage.timestamp || timeStr,
        };
        setToasts((prev) => [newToast, ...prev.slice(0, 4)]);
      }
    },
    []
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applySnapshot = useCallback(
    async (sessionId: string, roomHint?: PrayerRoom) => {
      if (!isServerSessionId(sessionId)) return;
      try {
        const snapshot = await sanctumApi.getSession(sessionId);
        const snapshotRoom = snapshot.room;
        const listed =
          roomHint ||
          prayerRooms.find((item) => item.id === String(snapshot.session.prayerRoomId));
        const room =
          listed ||
          (snapshotRoom?.name
            ? ({
                id: String(snapshotRoom.id || snapshot.session.prayerRoomId),
                name: String(snapshotRoom.name),
              } as PrayerRoom)
            : undefined);
        if (!room) return;
        const quality = connectionStateToQuality(livekitRealtimeProvider.connectionState);
        const mappedParticipants = mapSnapshotParticipants(snapshot.participants, sessionId, quality);
        const speaker = snapshot.activeSpeaker as { guestName?: string; realtimeIdentity?: string; id?: string } | null;
        const hands = mapSnapshotHands(snapshot.raisedHands, sessionId, mappedParticipants).map((hand) => ({
          ...hand,
          waitingSeconds: 0,
        }));
        mappedParticipants.forEach((participant) => {
          participant.isHandRaised = hands.some((hand) => hand.participantId === participant.id);
        });
        setParticipants(mappedParticipants);
        setRaisedHands(hands);
        setConnectedNow(snapshot.connectedNow);
        const sermonLeaderName = resolveSermonLeader(
          typeof snapshot.session.sermonLeaderName === 'string' ? snapshot.session.sermonLeaderName : '',
          snapshot.room?.roomSermonLeaderName,
          snapshot.room?.organization?.defaultSermonSpeaker
        );
        setLiveSession((prev) =>
          mapServerSession(
            { ...snapshot.session, sermonLeaderName },
            room,
            {
            organizationName: snapshot.room?.organization?.name || '',
            durationSeconds: prev?.id === sessionId ? prev.durationSeconds : 0,
            speakerDurationSeconds: prev?.id === sessionId ? prev.speakerDurationSeconds : 0,
            totalParticipants: snapshot.connectedNow,
            totalUniqueParticipants: snapshot.connectedNow,
            listenersWaitingCount: snapshot.connectedNow,
            activeSpeakerName: speaker?.guestName || '',
            activeSpeakerTitle: speaker ? 'Current speaker' : 'Waiting for the next prayer leader.',
            pttParticipantId: snapshot.liveState?.pttParticipantId ?? null,
            privatePrayer: snapshot.liveState?.privatePrayer ?? null,
          })
        );
        const roomStatus =
          snapshot.session.status === 'LIVE' || snapshot.session.status === 'STARTING'
            ? 'LIVE'
            : snapshot.session.status === 'WAITING'
              ? 'WAITING'
              : 'SCHEDULED';
        setPrayerRooms((prev) =>
          prev.map((item) => (item.id === room.id ? { ...item, status: roomStatus as PrayerRoom['status'] } : item))
        );
      } catch {
        /* Snapshot refresh is best-effort. */
      }
    },
    [prayerRooms]
  );

  // Keep congregation mute / roster in sync across Control Room + join tabs.
  useEffect(() => {
    const sessionId = liveSession && isServerSessionId(liveSession.id) ? liveSession.id : null;
    if (!sessionId) return;
    if (liveSession.status !== 'LIVE' && liveSession.status !== 'WAITING' && liveSession.status !== 'STARTING') {
      return;
    }
    const timer = window.setInterval(() => {
      void applySnapshot(sessionId);
    }, 1500);
    return () => window.clearInterval(timer);
  }, [liveSession?.id, liveSession?.status, applySnapshot]);

  const connectLiveKit = useCallback(
    async (params: {
      sessionId: string;
      guestName: string;
      asGuest: boolean;
      roomSlug: string;
      connectionKind?: 'listener' | 'control';
      realtimeIdentity?: string;
      passcode?: string;
    }) => {
      const join = await sessionApiAdapter.join(
        params.sessionId,
        params.guestName,
        params.asGuest ? undefined : actor,
        {
          asGuest: params.asGuest,
          connectionKind: params.connectionKind || 'listener',
          realtimeIdentity: params.realtimeIdentity,
          passcode: params.passcode,
        }
      );
      if (!join.ok || !join.token || !join.livekitUrl || !join.participant) {
        throw new Error(join.reason || 'LiveKit connection unavailable in this environment.');
      }
      await livekitRealtimeProvider.joinRoom({
        roomSlug: params.sessionId,
        displayName: params.guestName,
        role: 'LISTENER',
        token: join.token,
        livekitUrl: join.livekitUrl,
        audioOnly: dataSaverMode !== 'OFF',
      });
      saveJoinSession({
        sessionId: params.sessionId,
        participantId: join.participant.id,
        realtimeIdentity: join.participant.realtimeIdentity,
        token: join.token,
        livekitUrl: join.livekitUrl,
        guestName: params.guestName,
        asGuest: params.asGuest,
        passcode: params.passcode,
      });
      connectedRoomRef.current = params.sessionId;
      setLocalParticipantId(join.participant.id);
      localParticipantIdRef.current = join.participant.id;
      setConnectionState(livekitRealtimeProvider.connectionState);
      setAudioBlocked(livekitRealtimeProvider.audioBlocked);
      setConnectedNow(livekitRealtimeProvider.connectedCount);
      await applySnapshot(params.sessionId);
      return join.participant;
    },
    [actor.userId, actor.organizationId, applySnapshot, dataSaverMode]
  );

  useEffect(() => {
    return livekitRealtimeProvider.subscribe((event) => {
      const nextState = event.metadata?.connectionState as ConnectionState | undefined;
      if (nextState) {
        setConnectionState(nextState);
        setAudioBlocked(livekitRealtimeProvider.audioBlocked);
      }
      if (typeof event.metadata?.connectedNow === 'number') {
        setConnectedNow(event.metadata.connectedNow);
        setLiveSession((prev) =>
          prev
            ? {
                ...prev,
                totalParticipants: event.metadata!.connectedNow as number,
                totalUniqueParticipants: event.metadata!.connectedNow as number,
                listenersWaitingCount: event.metadata!.connectedNow as number,
              }
            : prev
        );
      }
      if (event.type === 'SPEAKER_INVITED') {
        const identity = livekitRealtimeProvider.getIdentity();
        const matchesIdentity = event.metadata?.realtimeIdentity === identity;
        const matchesParticipant = event.participantId === localParticipantIdRef.current;
        if (matchesIdentity || matchesParticipant) {
          setPendingSpeakerInvite({
            invitationId: typeof event.metadata?.invitationId === 'string' ? event.metadata.invitationId : undefined,
            participantId: event.participantId || String(localParticipantIdRef.current || ''),
          });
        }
      }
      if (event.type === 'CONGREGATION_MUTED') {
        const muted = event.muted !== false;
        setLiveSession((prev) =>
          prev
            ? {
                ...prev,
                congregationMuted: muted,
                pttParticipantId: event.liveState?.pttParticipantId ?? (muted ? null : prev.pttParticipantId),
                privatePrayer: muted ? null : event.liveState?.privatePrayer ?? prev.privatePrayer,
              }
            : prev
        );
      }
      if (event.type === 'PTT_STARTED' || event.type === 'PTT_ENDED') {
        setLiveSession((prev) =>
          prev
            ? {
                ...prev,
                pttParticipantId:
                  event.liveState?.pttParticipantId ??
                  (event.type === 'PTT_ENDED' ? null : event.participantId),
                privatePrayer: event.liveState?.privatePrayer ?? prev.privatePrayer,
              }
            : prev
        );
      }
      if (event.type === 'PRIVATE_PRAYER_STARTED' || event.type === 'PRIVATE_PRAYER_ENDED') {
        const meta = event;
        void (async () => {
          const identity = livekitRealtimeProvider.getIdentity();
          if (event.type === 'PRIVATE_PRAYER_STARTED' && identity) {
            const hostId = String(event.hostRealtimeIdentity || '');
            const memberId = String(event.memberRealtimeIdentity || '');
            if (identity === hostId && memberId) {
              await livekitRealtimeProvider.beginPrivatePrayer(memberId);
            } else if (identity === memberId && hostId) {
              await livekitRealtimeProvider.beginPrivatePrayer(hostId);
            }
          }
          if (event.type === 'PRIVATE_PRAYER_ENDED' && identity) {
            const hostId = String(event.hostRealtimeIdentity || '');
            const memberId = String(event.memberRealtimeIdentity || '');
            if (identity === hostId || identity === memberId) {
              await livekitRealtimeProvider.endPrivatePrayer();
            }
          }
        })();
        setLiveSession((prev) =>
          prev
            ? {
                ...prev,
                pttParticipantId: event.liveState?.pttParticipantId ?? prev.pttParticipantId,
                privatePrayer:
                  event.type === 'PRIVATE_PRAYER_ENDED'
                    ? null
                    : event.liveState?.privatePrayer ||
                      (event.hostParticipantId
                        ? {
                            hostParticipantId: String(event.hostParticipantId),
                            memberParticipantId: String(event.memberParticipantId),
                            hostRealtimeIdentity: String(event.hostRealtimeIdentity),
                            memberRealtimeIdentity: String(event.memberRealtimeIdentity),
                          }
                        : prev.privatePrayer),
              }
            : prev
        );
      }
      if (event.type === 'PARTICIPANT_MUTED') {
        const muted = event.metadata?.muted !== false;
        const targetId = event.participantId;
        if (targetId) {
          setParticipants((prev) =>
            prev.map((person) => (person.id === targetId ? { ...person, isMuted: muted } : person))
          );
        }
        if (muted && targetId && targetId === localParticipantIdRef.current) {
          void livekitRealtimeProvider.disableMicrophone();
        }
      }
      if (event.type === 'SESSION_STARTED') {
        setLiveSession((prev) =>
          prev ? { ...prev, status: 'LIVE', startedAt: prev.startedAt || new Date().toISOString() } : prev
        );
      }
      if (event.type === 'SESSION_ENDED') {
        setPrayerComplete(true);
        setPendingSpeakerInvite(null);
        void livekitRealtimeProvider.leaveRoom('', '');
        connectedRoomRef.current = null;
        setConnectionState('DISCONNECTED');
        setLiveSession((prev) => (prev ? { ...prev, status: 'ENDED', endedAt: new Date().toISOString() } : prev));
      }
      if (
        event.type === 'FLOOR_CHANGED' ||
        event.type === 'HAND_RAISED' ||
        event.type === 'HAND_LOWERED' ||
        event.type === 'HAND_DISMISSED' ||
        event.type === 'PARTICIPANT_JOINED' ||
        event.type === 'PARTICIPANT_LEFT' ||
        event.type === 'PARTICIPANT_REMOVED' ||
        event.type === 'SPEAKER_DECLINED' ||
        event.type === 'CONGREGATION_MUTED' ||
        event.type === 'PARTICIPANT_MUTED' ||
        event.type === 'PTT_STARTED' ||
        event.type === 'PTT_ENDED' ||
        event.type === 'PRIVATE_PRAYER_STARTED' ||
        event.type === 'PRIVATE_PRAYER_ENDED'
      ) {
        const sessionId = liveSessionIdRef.current;
        if (sessionId) void applySnapshot(sessionId);
      }
    });
  }, [applySnapshot]);

  const confirmAction = useCallback((options: ConfirmActionOptions) => {
    setConfirmModalConfig(options);
  }, []);

  const closeConfirmModal = useCallback(() => {
    setConfirmModalConfig(null);
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode((prev) => !prev);
  };

  const setDataSaverMode = (mode: DataSaverMode) => {
    setDataSaverModeState(mode);
    addToast(`Data saver mode set to ${mode.toLowerCase()}`, 'info');
  };

  // Prayer Room CRUD
  // Org-scoped slug uniqueness is enforced here until the Prisma unique index is live.
  const createPrayerRoom = async (
    data: Omit<PrayerRoom, 'id' | 'createdAt' | 'updatedAt'> & { passcode?: string | null }
  ): Promise<PrayerRoom> => {
    if (isMutatingRef.current) {
      throw new Error('Prayer room creation already in progress.');
    }
    isMutatingRef.current = true;
    try {
      if (isSlugTaken(prayerRooms, data.organizationId, data.slug)) {
        throw new Error('This Permanent Altar Link is already in use.');
      }

      const created = await sanctumApi.createPrayerRoom(
        {
          organizationId: data.organizationId,
          name: data.name,
          slug: data.slug,
          description: data.description,
          logoUrl: data.logoUrl || null,
          roomType: data.roomType,
          expectedAttendance: data.expectedAttendance,
          speakerPermission: data.speakerPermission,
          isRecurring: data.isRecurring,
          recurrenceRule: data.recurrenceRule,
          selectedDays: data.selectedDays,
          oneTimeDate: data.oneTimeDate,
          durationMinutes: data.durationMinutes,
          scheduledStart: data.scheduledStart,
          timezone: data.timezone,
          recordingEnabled: data.recordingEnabled,
          passcode: 'passcode' in data ? data.passcode : undefined,
          allowGuests: data.allowGuests,
          prayerRequestsEnabled: data.prayerRequestsEnabled,
          anonymousRequestsAllowed: data.anonymousRequestsAllowed,
          chatEnabled: data.chatEnabled,
          sermonLeaderUserId: data.sermonLeaderUserId,
          coHostUserIds: data.coHostUserIds,
        },
        actor
      );
      const roomRow = created.room as Record<string, unknown>;
      const { passcode: _passcode, ...roomData } = data;
      const newRoom: PrayerRoom = {
        ...mapServerPrayerRoom(roomRow),
        ...roomData,
        oneTimeDate: roomData.oneTimeDate || undefined,
        hasPasscode: Boolean(roomRow.hasPasscode) || Boolean(_passcode),
        id: String(roomRow.id),
        logoUrl:
          typeof roomRow.logoUrl === 'string' && roomRow.logoUrl.trim()
            ? roomRow.logoUrl.trim()
            : data.logoUrl,
        status: 'SCHEDULED',
        createdAt: roomRow.createdAt ? String(roomRow.createdAt) : new Date().toISOString(),
        updatedAt: roomRow.updatedAt ? String(roomRow.updatedAt) : new Date().toISOString(),
        permanentUrl: String(roomRow.permanentUrl || data.permanentUrl || `/join/${data.slug}`),
      };
      setPrayerRooms((prev) => {
        if (isSlugTaken(prev, data.organizationId, data.slug)) {
          return prev;
        }
        return [newRoom, ...prev];
      });
      addToast(`Created prayer room "${newRoom.name}"`, 'success');
      AuditLogger.log('ROOM_SETTINGS_CHANGED', { roomName: newRoom.name, note: 'Created new prayer room' });
      return newRoom;
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not create the prayer room on the server.';
      const wrapped = new Error(message) as Error & { fieldErrors?: Record<string, string> | null };
      if (error instanceof ApiClientError) wrapped.fieldErrors = error.fieldErrors;
      addToast(message, 'error');
      throw wrapped;
    } finally {
      isMutatingRef.current = false;
    }
  };

  const updatePrayerRoom = async (
    id: string,
    updates: Partial<PrayerRoom> & { passcode?: string | null }
  ): Promise<PrayerRoom> => {
    const current = prayerRooms.find((r) => r.id === id);
    if (!current) {
      throw new Error('Prayer room not found.');
    }
    if (updates.slug) {
      const organizationId = updates.organizationId || current.organizationId || '';
      if (isSlugTaken(prayerRooms, organizationId, updates.slug, id)) {
        throw new Error('This Permanent Altar Link is already in use.');
      }
    }

    try {
      const result = await sanctumApi.updatePrayerRoom(
        id,
        {
          name: updates.name,
          slug: updates.slug,
          description: updates.description,
          logoUrl: updates.logoUrl === undefined ? undefined : updates.logoUrl || null,
          roomType: updates.roomType,
          expectedAttendance: updates.expectedAttendance,
          speakerPermission: updates.speakerPermission,
          isRecurring: updates.isRecurring,
          recurrenceRule: updates.recurrenceRule,
          selectedDays: updates.selectedDays,
          oneTimeDate: updates.oneTimeDate,
          durationMinutes: updates.durationMinutes,
          scheduledStart: updates.scheduledStart,
          timezone: updates.timezone,
          recordingEnabled: updates.recordingEnabled,
          passcode: 'passcode' in updates ? updates.passcode : undefined,
          allowGuests: updates.allowGuests,
          prayerRequestsEnabled: updates.prayerRequestsEnabled,
          anonymousRequestsAllowed: updates.anonymousRequestsAllowed,
          chatEnabled: updates.chatEnabled,
          sermonLeaderUserId: updates.sermonLeaderUserId,
          coHostUserIds: updates.coHostUserIds,
        },
        actor
      );
      const mapped = mapServerPrayerRoom(result.room as Record<string, unknown>);
      setPrayerRooms((prev) => prev.map((r) => (r.id === id ? { ...r, ...mapped } : r)));
      addToast('Prayer room updated', 'success');
      AuditLogger.log('ROOM_UPDATED', { targetId: id, note: 'Updated room settings' });
      return mapped;
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not update the prayer room.';
      const wrapped = new Error(message) as Error & { fieldErrors?: Record<string, string> | null };
      if (error instanceof ApiClientError) wrapped.fieldErrors = error.fieldErrors;
      addToast(message, 'error');
      throw wrapped;
    }
  };

  const deletePrayerRoom = async (id: string) => {
    const target = prayerRooms.find((r) => r.id === id);
    try {
      await sanctumApi.deletePrayerRoom(id, actor);
      setPrayerRooms((prev) => prev.filter((r) => r.id !== id));
      setHistorySessions((prev) => prev.filter((session) => session.prayerRoomId !== id));
      setLiveSession((prev) => (prev?.prayerRoomId === id ? null : prev));
      addToast(`Prayer room "${target?.name || 'Altar'}" deleted`, 'info');
    } catch (error) {
      const message =
        error instanceof ApiClientError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not delete this prayer room.';
      addToast(message, 'error');
    }
  };

  const setCongregationMuted = async (muted: boolean) => {
    if (!liveSession || !isServerSessionId(liveSession.id)) {
      addToast('Open the sanctuary before changing room mode.', 'warning');
      return;
    }
    try {
      await sanctumApi.setCongregationMute(liveSession.id, muted, actor);
      setLiveSession((prev) =>
        prev
          ? {
              ...prev,
              congregationMuted: muted,
              pttParticipantId: muted ? null : prev.pttParticipantId,
              privatePrayer: muted ? null : prev.privatePrayer,
            }
          : prev
      );
      addToast(
        muted
          ? 'Sermon mode — only you and ministers can speak.'
          : 'The floor is open — congregants hold to speak, one at a time.',
        'info'
      );
    } catch (error) {
      addToast(
        error instanceof ApiClientError ? error.message : 'Could not change room mode.',
        'error'
      );
    }
  };

  const startPtt = async (participantId: string) => {
    if (!liveSession || !isServerSessionId(liveSession.id)) return;
    try {
      await sanctumApi.startPtt(liveSession.id, participantId);
      await livekitRealtimeProvider.setPttActive(true);
      setLiveSession((prev) => (prev ? { ...prev, pttParticipantId: participantId } : prev));
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not start push-to-talk.', 'warning');
      throw error;
    }
  };

  const endPtt = async (participantId: string) => {
    if (!liveSession || !isServerSessionId(liveSession.id)) return;
    try {
      await livekitRealtimeProvider.setPttActive(false);
      await sanctumApi.endPtt(liveSession.id, participantId);
      setLiveSession((prev) => (prev ? { ...prev, pttParticipantId: null } : prev));
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not end push-to-talk.', 'warning');
    }
  };

  const startPrivatePrayer = async (memberParticipantId: string) => {
    if (!liveSession || !isServerSessionId(liveSession.id)) return;
    try {
      const result = await sanctumApi.startPrivatePrayer(
        liveSession.id,
        { memberParticipantId, hostParticipantId: localParticipantIdRef.current || undefined },
        actor
      );
      const privatePrayer = {
        hostParticipantId: String(result.privatePrayer.hostParticipantId),
        memberParticipantId: String(result.privatePrayer.memberParticipantId),
        hostRealtimeIdentity: String(result.privatePrayer.hostRealtimeIdentity),
        memberRealtimeIdentity: String(result.privatePrayer.memberRealtimeIdentity),
      };
      setLiveSession((prev) => (prev ? { ...prev, privatePrayer, pttParticipantId: null } : prev));
      const identity = livekitRealtimeProvider.getIdentity();
      if (identity === privatePrayer.hostRealtimeIdentity) {
        await livekitRealtimeProvider.beginPrivatePrayer(privatePrayer.memberRealtimeIdentity);
      }
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not start private prayer.', 'error');
    }
  };

  const endPrivatePrayer = async () => {
    if (!liveSession || !isServerSessionId(liveSession.id)) return;
    const current = liveSession.privatePrayer;
    try {
      await sanctumApi.endPrivatePrayer(liveSession.id, actor);
      const identity = livekitRealtimeProvider.getIdentity();
      if (
        current &&
        identity &&
        (identity === current.hostRealtimeIdentity || identity === current.memberRealtimeIdentity)
      ) {
        await livekitRealtimeProvider.endPrivatePrayer();
      }
      setLiveSession((prev) => (prev ? { ...prev, privatePrayer: null } : prev));
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not end private prayer.', 'error');
    }
  };

  const connectControlRoom = async (roomId: string) => {
    const room = prayerRooms.find((r) => r.id === roomId) || prayerRooms[0];
    let sessionId =
      liveSession && liveSession.prayerRoomId === room?.id && isServerSessionId(liveSession.id)
        ? liveSession.id
        : liveSessionIdRef.current;
    if (!room) return;
    if (!sessionId) {
      try {
        const altar = await sanctumApi.getAltar(room.slug);
        const session = altar.session;
        const status = session?.status;
        if (!session?.id || (status !== 'WAITING' && status !== 'LIVE' && status !== 'STARTING')) {
          return;
        }
        sessionId = String(session.id);
        liveSessionIdRef.current = sessionId;
        await applySnapshot(sessionId, room);
      } catch {
        return;
      }
    }
    if (connectedRoomRef.current === sessionId && livekitRealtimeProvider.connectionState === 'CONNECTED') {
      return;
    }
    try {
      await connectLiveKit({
        sessionId,
        guestName: user?.name || 'Prayer Leader',
        asGuest: false,
        roomSlug: room.slug,
        connectionKind: 'control',
      });
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Control Room could not connect to prayer audio.', 'warning');
    }
  };

  // LIFECYCLE: Open Sanctuary (WAITING State)
  const openSanctuary = async (roomId: string, sermonLeaderName: string) => {
    if (isMutatingRef.current) return;
    const leaderName = sermonLeaderName.trim();
    if (!leaderName) {
      addToast('Enter the sermon or prayer leader for this session.', 'warning');
      return;
    }
    isMutatingRef.current = true;
    try {
      const room = prayerRooms.find((r) => r.id === roomId) || prayerRooms[0];
      if (!room) return;
      setPrayerComplete(false);

      try {
        const opened = await sanctumApi.openSessionForRoom(room.id, actor, leaderName);
        const mapped = mapServerSession(opened.session, room, {
          listenersWaitingCount: 0,
          totalParticipants: 0,
          totalUniqueParticipants: 0,
        });
        setLiveSession(mapped);
        liveSessionIdRef.current = mapped.id;
        setPrayerRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: 'WAITING' } : r)));
        await connectControlRoom(room.id);
        AuditLogger.log('SANCTUARY_OPENED', {
          sessionId: mapped.id,
          roomName: room.name,
          note: 'Sanctuary waiting room opened for attendees',
        });
        addToast(`Sanctuary opened for "${room.name}". Members can now enter waiting sanctuary.`, 'info');
      } catch (error) {
        addToast(
          error instanceof ApiClientError
            ? error.message
            : 'LiveKit connection unavailable in this environment.',
          'warning'
        );
      }
    } finally {
      isMutatingRef.current = false;
    }
  };

  // LIFECYCLE: Start Live Session (LIVE State)
  const startPrayerSession = async (roomId: string, sermonLeaderName = '') => {
    if (isMutatingRef.current) return;
    isMutatingRef.current = true;
    try {
      const room = prayerRooms.find((r) => r.id === roomId) || prayerRooms[0];
      if (!room) return;

      if (liveSession && liveSession.status === 'LIVE' && liveSession.prayerRoomId === room.id && isServerSessionId(liveSession.id)) {
        addToast(`Prayer session is already LIVE for ${room.name}`, 'info');
        await connectControlRoom(room.id);
        return;
      }

      let sessionId =
        liveSession && liveSession.prayerRoomId === room.id && isServerSessionId(liveSession.id)
          ? liveSession.id
          : null;

      try {
        if (!sessionId || liveSession?.status === 'SCHEDULED') {
          const leaderName = sermonLeaderName.trim() || liveSession?.sermonLeaderName?.trim() || '';
          const opened = await sanctumApi.openSessionForRoom(room.id, actor, leaderName);
          sessionId = String(opened.session.id);
          setLiveSession(mapServerSession(opened.session, room));
          liveSessionIdRef.current = sessionId;
        }
        const started = await sanctumApi.startPrayerSession(sessionId, actor);
        const session = started.session || {
          id: sessionId,
          status: 'LIVE',
          prayerRoomId: room.id,
        };
        setLiveSession(
          mapServerSession(session, room, {
            startedAt: new Date().toISOString(),
            totalParticipants: connectedNow,
            totalUniqueParticipants: connectedNow,
          })
        );
        setPrayerRooms((prev) => prev.map((r) => (r.id === room.id ? { ...r, status: 'LIVE' } : r)));
        await connectControlRoom(room.id);
        AuditLogger.log('SESSION_STARTED', {
          sessionId,
          roomName: room.name,
          note: 'Live prayer session started',
        });
        addToast(`Live prayer session started for "${room.name}". Turn on your microphone to lead.`, 'success');
      } catch (error) {
        addToast(
          error instanceof ApiClientError
            ? error.message
            : 'LiveKit connection unavailable in this environment.',
          'warning'
        );
      }
    } finally {
      isMutatingRef.current = false;
    }
  };

  // LIFECYCLE: End Live Session (ENDING -> ENDED State)
  const endPrayerSession = async (sessionIdOrAdminId?: string, adminId?: string) => {
    if (isMutatingRef.current) return;
    isMutatingRef.current = true;
    try {
      if (!liveSession) {
        addToast('No active prayer session to end', 'info');
        return;
      }

      const apiResult = await sessionApiAdapter.endSession(liveSession.id, {
        userId: adminId || actor.userId || sessionIdOrAdminId,
        organizationId: actor.organizationId,
      });
      if (!apiResult.ok) {
        addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
      }

      await livekitRealtimeProvider.leaveRoom(liveSession.id, localParticipantId || '');
      connectedRoomRef.current = null;
      setConnectionState('DISCONNECTED');
      setPrayerComplete(true);

      const endedSession: PrayerSession = {
        ...liveSession,
        status: 'ENDED',
        endedAt: new Date().toISOString(),
        peakConcurrentParticipants: Math.max(liveSession.peakConcurrentParticipants, connectedNow),
      };

      setHistorySessions((prev) => [endedSession, ...prev]);
      setLiveSession(endedSession);
      setPrayerRooms((prev) =>
        prev.map((r) => (r.id === liveSession.prayerRoomId ? { ...r, status: 'SCHEDULED' } : r))
      );

      AuditLogger.log('SESSION_ENDED', {
        sessionId: endedSession.id,
        roomName: endedSession.roomName,
        note: `Prayer session ended with ${endedSession.totalUniqueParticipants || endedSession.totalParticipants} participants`,
      });

      addToast('Live prayer session concluded and recorded safely.', 'info');
    } finally {
      isMutatingRef.current = false;
    }
  };

  // LIFECYCLE: Cancel Session
  const cancelPrayerSession = (sessionId: string) => {
    if (liveSession && liveSession.id === sessionId) {
      const targetRoomId = liveSession.prayerRoomId;
      setLiveSession(null);
      setPrayerRooms((prev) =>
        prev.map((r) => (r.id === targetRoomId ? { ...r, status: 'SCHEDULED' } : r))
      );
      AuditLogger.log('SESSION_CANCELLED', { sessionId, note: 'Session cancelled before start' });
      addToast('Prayer session cancelled', 'info');
    }
  };

  // Moderation: Invite to speak
  const inviteToPray = async (participantId: string, adminId: string = actor.userId || '') => {
    const participant = participants.find((p) => p.id === participantId);
    const hand = raisedHands.find((h) => h.participantId === participantId);
    const name = participant?.displayName || hand?.displayName || 'Attendee';

    const apiResult = await sessionApiAdapter.inviteSpeaker(liveSession?.id, participantId, {
      userId: adminId || actor.userId,
      organizationId: actor.organizationId,
    });
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
      return;
    }

    setRaisedHands((prev) =>
      prev.map((item) => (item.participantId === participantId ? { ...item, status: 'INVITED' } : item))
    );

    AuditLogger.log('PARTICIPANT_INVITED_TO_SPEAK', {
      targetId: participantId,
      targetName: name,
      note: `Invited ${name} to speak in prayer`,
    });

    addToast(`Invited ${name} to pray. Waiting for them to accept.`, 'success');
  };

  const dismissHand = async (raisedHandId: string) => {
    const hand = raisedHands.find((h) => h.id === raisedHandId);
    const apiResult = await sessionApiAdapter.dismissHand(liveSession?.id, raisedHandId, actor);
    if (!apiResult.ok && isServerSessionId(liveSession?.id)) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
    }
    setRaisedHands((prev) => prev.filter((h) => h.id !== raisedHandId));
    if (hand) {
      setParticipants((prev) =>
        prev.map((p) => (p.id === hand.participantId ? { ...p, isHandRaised: false } : p))
      );
      addToast(`Dismissed hand request from ${hand.displayName}`, 'info');
    }
  };

  const muteSpeaker = async (participantId: string, adminId: string = actor.userId || '') => {
    const target = participants.find((p) => p.id === participantId);
    const apiResult = await sessionApiAdapter.muteParticipant(liveSession?.id, participantId, {
      userId: adminId || actor.userId,
      organizationId: actor.organizationId,
    });
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isMuted: true } : p))
    );
    AuditLogger.log('PARTICIPANT_MUTED', { targetId: participantId, targetName: target?.displayName });
    addToast(`Muted ${target?.displayName || 'speaker'}`, 'warning');
  };

  const unmuteParticipant = async (participantId: string, adminId: string = actor.userId || '') => {
    const target = participants.find((p) => p.id === participantId);
    const apiResult = await sessionApiAdapter.unmuteParticipant(liveSession?.id, participantId, {
      userId: adminId || actor.userId,
      organizationId: actor.organizationId,
    });
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
      return;
    }
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isMuted: false } : p))
    );
    addToast(
      `Allowed ${target?.displayName || 'this person'} to speak. Ask them to tap Unmute microphone on their phone.`,
      'success'
    );
  };

  const endSpeaker = async (participantId: string, adminId: string = actor.userId || '') => {
    const target = participants.find((p) => p.id === participantId);
    const stored = loadJoinSession();
    const guestPath = stored?.asGuest === true && stored.participantId === participantId;
    const apiResult = await sessionApiAdapter.revokeSpeaker(
      liveSession?.id,
      participantId,
      guestPath ? {} : { userId: adminId || actor.userId, organizationId: actor.organizationId },
      stored?.realtimeIdentity
    );
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
    }
    if (participantId === localParticipantId) {
      await livekitRealtimeProvider.disableMicrophone();
    }
    if (liveSession?.id) await applySnapshot(liveSession.id);

    AuditLogger.log('PARTICIPANT_RETURNED_TO_LISTENER', { targetId: participantId, targetName: target?.displayName });
    addToast(`Concluded prayer turn for ${target?.displayName || 'speaker'}`, 'info');
  };

  const removeParticipant = async (participantId: string, adminId: string = actor.userId || '') => {
    const target = participants.find((p) => p.id === participantId);
    const apiResult = await sessionApiAdapter.removeParticipant(liveSession?.id, participantId, {
      userId: adminId || actor.userId,
      organizationId: actor.organizationId,
    });
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
    }

    setParticipants((prev) => prev.filter((p) => p.id !== participantId));
    setRaisedHands((prev) => prev.filter((h) => h.participantId !== participantId));
    AuditLogger.log('PARTICIPANT_REMOVED', { targetId: participantId, targetName: target?.displayName });
    addToast(`Removed ${target?.displayName || 'participant'} from room`, 'info');
  };

  const updateParticipantRole = async (participantId: string, newRole: Role, adminId: string = '') => {
    const target = participants.find((p) => p.id === participantId);
    addToast(`Role changes are applied in the Control Room preview until the server session is connected.`, 'warning');

    setParticipants((prev) =>
      prev.map((p) =>
        p.id === participantId
          ? {
              ...p,
              role: newRole,
              isMuted: newRole === 'LISTENER' ? true : p.isMuted,
            }
          : p
      )
    );

    AuditLogger.log('ROLE_CHANGED', { targetId: participantId, targetName: target?.displayName, note: `Role changed to ${newRole}` });
    addToast(`Promoted ${target?.displayName || 'member'} to ${newRole.replace('_', ' ')}`, 'success');
  };

  // Public attendee join
  const joinPrayerRoom = async (roomSlug: string, name: string, options?: { passcode?: string }) => {
    setPrayerComplete(false);

    let altar;
    try {
      altar = await sanctumApi.getAltar(roomSlug);
    } catch (error) {
      if (error instanceof ApiClientError) {
        addToast(error.message, 'warning');
        throw error;
      }
      addToast('This prayer gathering is not open to join yet, or has already ended.', 'warning');
      throw error;
    }
    if (!altar.session?.id) {
      addToast('This prayer gathering is not open to join yet, or has already ended.', 'warning');
      throw new Error('SESSION_NOT_JOINABLE');
    }

    const room =
      prayerRooms.find((r) => r.slug === roomSlug) ||
      prayerRooms.find((r) => r.id === altar.room.id) || {
        id: altar.room.id,
        organizationId: organization?.id || '',
        name: altar.room.name,
        slug: altar.room.slug,
        expectedAttendance: 0,
        roomType: 'AUDIO_PRAYER' as const,
        speakerPermission: 'ADMIN_APPROVAL_REQUIRED' as const,
        isRecurring: false,
        scheduledStart: '',
        timezone: 'Africa/Kampala',
        recordingEnabled: false,
        status: 'WAITING' as const,
        permanentUrl: `/join/${altar.room.slug}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    setLiveSession((prev) =>
      mapServerSession(
        {
          id: altar.session!.id,
          status: altar.session!.status,
          prayerRoomId: room.id,
          sermonLeaderName: resolveSermonLeader(
            altar.session!.sermonLeaderName,
            altar.room.roomSermonLeaderName,
            altar.room.defaultSermonSpeaker
          ),
        },
        room,
        { organizationName: altar.room.organizationName || '' }
      )
    );

    const asStaff = Boolean(
      actor.userId && actor.organizationId && altar.room.organizationId === actor.organizationId
    );

    const participant = await connectLiveKit({
      sessionId: altar.session.id,
      guestName: name.trim(),
      asGuest: !asStaff,
      roomSlug,
      connectionKind: 'listener',
      passcode: options?.passcode,
    });

    addToast({
      type: 'participant_join',
      title: asStaff ? 'You joined as prayer leader' : 'Attendee Joined Gathering',
      message: asStaff
        ? `Turn on your microphone to lead "${room?.name || 'Prayer Room'}".`
        : `${name} entered "${room?.name || 'Prayer Room'}" as an audio listener`,
      meta: { participantName: name, roomName: room?.name },
    });

    return { participantId: participant.id, role: 'LISTENER' as Role };
  };

  const raiseHandAttendee = async (participantId: string, name: string) => {
    const apiResult = await sessionApiAdapter.raiseHand(liveSession?.id, participantId);
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
      return false;
    }
    if (liveSession?.id) await applySnapshot(liveSession.id);

    addToast({
      type: 'hand_raised',
      title: 'Hand Raised for Intercession',
      message: `${name} has raised a hand in the prayer gathering queue`,
      meta: { participantName: name },
    });
    return true;
  };

  const lowerHandAttendee = async (participantId: string) => {
    const apiResult = await sessionApiAdapter.lowerHand(liveSession?.id, participantId);
    if (!apiResult.ok && isServerSessionId(liveSession?.id)) {
      addToast(apiResult.reason || 'Realtime Engine: Not configured', 'warning');
    }
    setRaisedHands((prev) => prev.filter((h) => h.participantId !== participantId));
    setParticipants((prev) =>
      prev.map((p) => (p.id === participantId ? { ...p, isHandRaised: false } : p))
    );
    addToast('Hand lowered', 'info');
  };

  const enablePrayerAudio = async () => {
    const started = await livekitRealtimeProvider.tryStartAudio();
    setAudioBlocked(!started);
    if (started) addToast('Prayer audio enabled', 'success');
  };

  const reconnectToPrayer = async (opts?: { silent?: boolean }) => {
    const stored = loadJoinSession();
    if (!stored) {
      if (!opts?.silent) addToast('Reconnect is unavailable. Join the gathering again.', 'warning');
      return;
    }
    try {
      if (actor.userId && !stored.asGuest) {
        await connectLiveKit({
          sessionId: stored.sessionId,
          guestName: stored.guestName || user?.name || 'Prayer Leader',
          asGuest: false,
          roomSlug: stored.sessionId,
          connectionKind: stored.realtimeIdentity?.endsWith('_control') ? 'control' : 'listener',
          realtimeIdentity: stored.realtimeIdentity,
          passcode: stored.passcode,
        });
      } else if (actor.userId && stored.asGuest) {
        await connectLiveKit({
          sessionId: stored.sessionId,
          guestName: stored.guestName || 'Listener',
          asGuest: true,
          roomSlug: stored.sessionId,
          connectionKind: 'listener',
          realtimeIdentity: stored.realtimeIdentity,
          passcode: stored.passcode,
        });
      } else {
        await connectLiveKit({
          sessionId: stored.sessionId,
          guestName: stored.guestName,
          asGuest: true,
          roomSlug: stored.sessionId,
          connectionKind: 'listener',
          realtimeIdentity: stored.realtimeIdentity,
          passcode: stored.passcode,
        });
      }
      if (!opts?.silent) addToast('Reconnected to prayer', 'success');
    } catch (error) {
      addToast(error instanceof Error ? error.message : 'Reconnect failed', 'error');
    }
  };

  const acceptSpeakerInvite = async () => {
    const stored = loadJoinSession();
    const participantId = pendingSpeakerInvite?.participantId || localParticipantId || stored?.participantId;
    if (!participantId || !liveSession?.id) return;
    if (liveSession.status !== 'LIVE') {
      addToast('Prayer has not started. The host must click Start Prayer before you can speak.', 'warning');
      return;
    }
    const apiResult = await sessionApiAdapter.acceptSpeaker(liveSession.id, {
      participantId,
      invitationId: pendingSpeakerInvite?.invitationId,
      realtimeIdentity: stored?.realtimeIdentity,
    });
    if (!apiResult.ok) {
      addToast(apiResult.reason || 'Invitation is no longer active.', 'warning');
      return;
    }
    try {
      await livekitRealtimeProvider.enableMicrophone();
    } catch {
      const storedJoin = loadJoinSession();
      await sessionApiAdapter.revokeSpeaker(
        liveSession.id,
        participantId,
        storedJoin?.asGuest ? {} : actor,
        storedJoin?.realtimeIdentity
      );
      addToast('Microphone permission is required to lead in prayer. Invitation released.', 'warning');
      setPendingSpeakerInvite(null);
      return;
    }
    setPendingSpeakerInvite(null);
    await applySnapshot(liveSession.id);
    addToast("You're now live! Lead the church in prayer.", 'success');
  };

  const declineSpeakerInvite = async () => {
    const participantId = pendingSpeakerInvite?.participantId || localParticipantId;
    if (participantId && liveSession?.id) {
      await sessionApiAdapter.declineSpeaker(liveSession.id, participantId);
    }
    setPendingSpeakerInvite(null);
    addToast('Declined speaker invitation', 'info');
  };

  const leavePrayerRoom = async () => {
    const stored = loadJoinSession();
    if (stored) {
      await sessionApiAdapter.leaveSession(stored.sessionId, stored.participantId);
      await livekitRealtimeProvider.leaveRoom(stored.sessionId, stored.participantId);
    }
    clearJoinSession();
    connectedRoomRef.current = null;
    setLocalParticipantId(null);
    setPendingSpeakerInvite(null);
    setConnectionState('DISCONNECTED');
    setAudioBlocked(false);
  };

  const sendReactionAttendee = (emoji: 'AMEN' | 'PRAISE_GOD') => {
    if (emoji === 'AMEN') {
      addToast('🙏 Amen!', 'info');
    } else {
      addToast('❤️ Praise God!', 'info');
    }
  };

  const submitPrayerRequest = (data: {
    request: string;
    isPrivate: boolean;
    participantName: string;
    roomName?: string;
  }) => {
    const room = prayerRooms.find((item) => item.id === liveSession?.prayerRoomId);
    if (room && room.prayerRequestsEnabled === false) {
      addToast('Prayer requests are turned off for this room.', 'warning');
      return;
    }
    const name = data.participantName.trim();
    if (room && room.anonymousRequestsAllowed === false && (!name || name.toLowerCase() === 'anonymous')) {
      addToast('This room requires your name on prayer requests.', 'warning');
      return;
    }
    const newReq: PrayerRequest = {
      id: `req_${Date.now()}`,
      sessionId: liveSession?.id || 'session_live',
      participantName: name || 'Anonymous',
      request: data.request,
      isPrivate: data.isPrivate,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      roomName: data.roomName || 'Corporate Prayer Gathering',
    };

    setPrayerRequests((prev) => [newReq, ...prev]);

    const snippet = data.request.length > 55 ? `${data.request.substring(0, 55)}...` : data.request;
    addToast({
      type: 'prayer_request',
      title: data.isPrivate ? 'Confidential Pastoral Request' : 'New Altar Prayer Request',
      message: `"${snippet}" — ${data.participantName}`,
      meta: { participantName: data.participantName, roomName: data.roomName, isPrivate: data.isPrivate },
    });
  };

  const markPrayerRequestAnswered = (id: string, note?: string) => {
    setPrayerRequests((prev) =>
      prev.map((req) =>
        req.id === id
          ? {
              ...req,
              status: 'ANSWERED',
              adminNote: note || req.adminNote || 'Marked answered in prayer.',
              updatedAt: new Date().toISOString(),
            }
          : req
      )
    );
    addToast('Prayer request marked as answered / praise report', 'success');
  };

  const archivePrayerRequest = (id: string) => {
    setPrayerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, status: 'ARCHIVED', updatedAt: new Date().toISOString() } : req))
    );
    addToast('Prayer request archived', 'info');
  };

  const addPrayerRequestNote = (id: string, note: string) => {
    setPrayerRequests((prev) =>
      prev.map((req) => (req.id === id ? { ...req, adminNote: note, updatedAt: new Date().toISOString() } : req))
    );
    addToast('Note saved to prayer request', 'success');
  };

  // Demo simulation triggers for moderators to test alerts in real-time
  const simulateParticipantJoin = (customName?: string) => {
    const randomNames = [
      'Sarah Ninsiima',
      'Deacon David Ochieng',
      'Mary Mukasa',
      'Elder Peter Kiggundu',
      'Grace Achieng',
      'Sister Rebecca Nabirye',
      'Brother Emmanuel Kato',
      'Faith Namugga',
    ];
    const name = customName || randomNames[Math.floor(Math.random() * randomNames.length)];
    joinPrayerRoom(prayerRooms[0]?.slug || 'morning-prayer', name);
  };

  const simulateIncomingPrayerRequest = (customRequest?: string) => {
    const samples = [
      { text: 'Praying for my mother undergoing surgery this morning in Kampala.', isPrivate: false, name: 'Sister Faith' },
      { text: 'Confidential request: Pastoral guidance regarding family reconciliation.', isPrivate: true, name: 'Anonymous Member' },
      { text: 'Interceding for breakthrough in youth ministry and campus outreach.', isPrivate: false, name: 'Joshua Tumusiime' },
      { text: 'Praise report! Healing from persistent fever after Friday intercession.', isPrivate: false, name: 'Dorothy Namutebi' },
    ];
    const sample = samples[Math.floor(Math.random() * samples.length)];
    submitPrayerRequest({
      request: customRequest || sample.text,
      isPrivate: sample.isPrivate,
      participantName: sample.name,
      roomName: prayerRooms[0]?.name || 'Morning Prayer',
    });
  };

  const allPrayerSessions = [
    ...(liveSession ? [liveSession] : []),
    ...scheduledSessions,
    ...historySessions,
  ];

  return (
    <AppContext.Provider
      value={{
        prayerRooms: prayerRooms || [],
        prayerSessions: allPrayerSessions,
        historySessions: historySessions || [],
        liveSession,
        participants: participants || [],
        raisedHands: raisedHands || [],
        prayerRequests: prayerRequests || [],
        dataSaverMode,
        isDarkMode,
        toasts: toasts || [],
        confirmModalConfig,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        toggleDarkMode,
        setDataSaverMode,
        addToast,
        removeToast,
        confirmAction,
        closeConfirmModal,
        createPrayerRoom,
        updatePrayerRoom,
        deletePrayerRoom,
        setCongregationMuted,
        startPtt,
        endPtt,
        startPrivatePrayer,
        endPrivatePrayer,
        openSanctuary,
        startPrayerSession,
        endPrayerSession,
        cancelPrayerSession,
        startLiveSession: startPrayerSession,
        endLiveSession: endPrayerSession,
        inviteToPray,
        inviteSpeaker: inviteToPray,
        dismissHand,
        dismissRaisedHand: dismissHand,
        muteSpeaker,
        muteParticipant: muteSpeaker,
        unmuteParticipant,
        endSpeaker,
        removeParticipant,
        updateParticipantRole,
        assignRole: updateParticipantRole,
        joinPrayerRoom,
        raiseHandAttendee,
        lowerHandAttendee,
        sendReactionAttendee,
        submitPrayerRequest,
        markPrayerRequestAnswered,
        archivePrayerRequest,
        addPrayerRequestNote,
        addNoteToPrayerRequest: addPrayerRequestNote,
        simulateParticipantJoin,
        simulateIncomingPrayerRequest,
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
        connectControlRoom,
        leavePrayerRoom,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
