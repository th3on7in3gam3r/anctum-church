import React from 'react';
import { Hand, HeartHandshake, Mic, MicOff } from 'lucide-react';
import type { Participant, PrayerRequest, Role } from '../../types';
const MINISTER_ROLES: Role[] = ['OWNER', 'ADMIN', 'PRAYER_LEADER', 'TECHNICAL_ADMIN'];

function isMinister(role: Role): boolean {
  return MINISTER_ROLES.includes(role);
}

type MicTone = 'live' | 'ready' | 'locked';

interface CongregationRosterProps {
  participants: Participant[];
  micOnByIdentity: Record<string, boolean>;
  localIdentity?: string | null;
  discussionOpen: boolean;
  raisedHandParticipantIds: Set<string>;
  prayerRequestParticipantIds: Set<string>;
  pttParticipantId?: string | null;
  privatePrayerMemberId?: string | null;
  canPrivatePray: boolean;
  onPrivatePrayStart: (participantId: string) => void;
  onPrivatePrayEnd: () => void;
  onMute?: (participantId: string) => void;
}

export const CongregationRoster: React.FC<CongregationRosterProps> = ({
  participants,
  micOnByIdentity,
  localIdentity,
  discussionOpen,
  raisedHandParticipantIds,
  prayerRequestParticipantIds,
  pttParticipantId,
  privatePrayerMemberId,
  canPrivatePray,
  onPrivatePrayStart,
  onPrivatePrayEnd,
  onMute,
}) => {
  const connectedCongregants = participants
    .filter((person) => !person.leftAt && !isMinister(person.role))
    .filter((person) => !localIdentity || person.externalIdentity !== localIdentity);
  const nameTotals = new Map<string, number>();
  connectedCongregants.forEach((person) => {
    const key = person.displayName.trim().toLocaleLowerCase();
    nameTotals.set(key, (nameTotals.get(key) || 0) + 1);
  });
  const nameOccurrences = new Map<string, number>();
  const congregation = connectedCongregants
    .map((person) => {
      const nameKey = person.displayName.trim().toLocaleLowerCase();
      const occurrence = (nameOccurrences.get(nameKey) || 0) + 1;
      nameOccurrences.set(nameKey, occurrence);
      const micOn = Boolean(person.externalIdentity && micOnByIdentity[person.externalIdentity]);
      let micTone: MicTone = 'locked';
      if (micOn || person.id === pttParticipantId || person.id === privatePrayerMemberId) {
        micTone = 'live';
      } else if (discussionOpen) {
        micTone = 'ready';
      }
      return {
        ...person,
        displayName:
          nameTotals.get(nameKey) && nameTotals.get(nameKey)! > 1
            ? `${person.displayName} · ${occurrence}`
            : person.displayName,
        micOn,
        micTone,
      };
    })
    .sort((a, b) => {
      if (a.micTone === 'live' && b.micTone !== 'live') return -1;
      if (b.micTone === 'live' && a.micTone !== 'live') return 1;
      return a.displayName.localeCompare(b.displayName);
    });

  const liveCount = congregation.filter((person) => person.micTone === 'live').length;

  return (
    <div className="bg-white dark:bg-[#17221D] p-4 sm:p-5 rounded-3xl border border-[#E5E6E1] dark:border-[#26362F] shadow-xs h-full flex flex-col">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-bold text-[#16251F] dark:text-[#F8F7F3]">
            Congregation ({congregation.length})
          </h3>
          <p className="text-xs text-[#68736D] dark:text-[#96A39D] mt-0.5">
            {discussionOpen
              ? 'The floor is open. Press and hold a name for private prayer with that person.'
              : 'Sermon mode. Press and hold a name for a private prayer sideline.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              discussionOpen
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'bg-[#B94A48]/10 text-[#B94A48]'
            }`}
          >
            {discussionOpen ? <Mic className="w-3 h-3" /> : <MicOff className="w-3 h-3" />}
            {discussionOpen ? 'Floor open' : 'Sermon'}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
              liveCount > 0
                ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
                : 'bg-black/5 dark:bg-white/5 text-[#68736D] dark:text-[#96A39D]'
            }`}
          >
            {liveCount} live now
          </span>
        </div>
      </div>

      <div className="flex-1 max-h-[28rem] overflow-y-auto pr-1 space-y-1.5">
        {congregation.length === 0 && (
          <p className="text-xs text-[#68736D] dark:text-[#96A39D] py-8 text-center">
            No congregants have joined yet. They enter their name at the public join link.
          </p>
        )}

        {congregation.map((person) => {
          const handRaised = raisedHandParticipantIds.has(person.id);
          const hasPrayerRequest = prayerRequestParticipantIds.has(person.id);
          const inPrivate = privatePrayerMemberId === person.id;
          const micClass =
            person.micTone === 'live'
              ? 'text-emerald-600 dark:text-emerald-400'
              : person.micTone === 'ready'
                ? 'text-[#B94A48]'
                : 'text-[#9AA39D] dark:text-[#5A6861]';

          return (
            <div
              key={person.id}
              onPointerDown={(e) => {
                if (!canPrivatePray || e.button !== 0) return;
                e.currentTarget.setPointerCapture(e.pointerId);
                onPrivatePrayStart(person.id);
              }}
              onPointerUp={() => {
                if (!canPrivatePray) return;
                onPrivatePrayEnd();
              }}
              onPointerCancel={() => {
                if (!canPrivatePray) return;
                onPrivatePrayEnd();
              }}
              onContextMenu={(e) => e.preventDefault()}
              className={`select-none touch-none flex items-center justify-between gap-3 px-3 py-2.5 rounded-2xl border cursor-pointer ${
                inPrivate
                  ? 'border-[#C9A35A]/60 bg-[#C9A35A]/10'
                  : person.micTone === 'live'
                    ? 'border-emerald-500/40 bg-emerald-500/5'
                    : 'border-[#E5E6E1] dark:border-[#26362F] bg-[#F8F7F3]/80 dark:bg-[#101814]/50'
              }`}
              title={canPrivatePray ? 'Press and hold for private prayer' : undefined}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-[#203C32]/10 dark:bg-[#C9A35A]/15 text-[#203C32] dark:text-[#C9A35A] flex items-center justify-center font-bold text-[10px] shrink-0">
                  {person.displayName.substring(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#16251F] dark:text-[#F8F7F3] truncate flex items-center gap-1.5">
                    <span className="truncate">{person.displayName}</span>
                    <Mic className={`w-3.5 h-3.5 shrink-0 ${micClass}`} aria-label={`Mic ${person.micTone}`} />
                  </p>
                  <div className="flex items-center gap-2 mt-0.5 min-h-[14px]">
                    {handRaised && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-700 dark:text-amber-300">
                        <Hand className="w-3 h-3" />
                        Hand
                      </span>
                    )}
                    {hasPrayerRequest && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#203C32] dark:text-[#C9A35A]">
                        <HeartHandshake className="w-3 h-3" />
                        Prayer
                      </span>
                    )}
                    {inPrivate && (
                      <span className="text-[10px] font-bold text-[#C9A35A]">Private</span>
                    )}
                    {person.id === pttParticipantId && !inPrivate && (
                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300">Speaking</span>
                    )}
                  </div>
                </div>
              </div>

              {onMute && person.micOn && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMute(person.id);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="shrink-0 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-[#B94A48] text-white cursor-pointer"
                >
                  Mute
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export function prayerRequestIdsFromList(requests: PrayerRequest[]): Set<string> {
  const ids = new Set<string>();
  for (const req of requests) {
    if (req.status === 'PENDING' || req.status === 'ANSWERED') {
      if (req.participantId) ids.add(req.participantId);
    }
  }
  return ids;
}
