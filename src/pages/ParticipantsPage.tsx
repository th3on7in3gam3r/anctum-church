import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ParticipantRow } from '../components/dashboard/ParticipantRow';
import { RoleBadge } from '../components/common/RoleBadge';
import { InviteTeamModal } from '../components/dashboard/InviteTeamModal';
import { BackButton } from '../components/common/BackButton';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { DevelopmentPreviewBadge } from '../components/common/DevelopmentPreviewBadge';
import { Role } from '../types';
import {
  Search,
  Shield,
  Users,
  Mic,
  VolumeX,
  Hand,
  Info,
  UserPlus,
} from 'lucide-react';
import { ConnectionStatus } from '../components/common/ConnectionStatus';
import { getParticipantActivityState, RealtimeStatusIndicator } from '../components/common/RealtimeStatusIndicator';
import { ROLE_CAPABILITIES } from '../lib/permissions';

interface ParticipantsPageProps {
  onNavigate: (path: string) => void;
}

type FilterTab = 'ALL' | 'ACTIVE_SPEAKING' | 'MUTED' | 'HAND_RAISED' | 'PRAYER_LEADER';

export const ParticipantsPage: React.FC<ParticipantsPageProps> = ({ onNavigate: _onNavigate }) => {
  const {
    participants = [],
    inviteSpeaker,
    muteParticipant,
    assignRole,
    removeParticipant,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<FilterTab>('ALL');
  const [showMatrixModal, setShowMatrixModal] = useState(false);
  const [showInviteTeamModal, setShowInviteTeamModal] = useState(false);
  const [selectedParticipantId, setSelectedParticipantId] = useState<string | null>(null);

  // Computed summary metrics
  const totalCount = participants.length;
  const speakingCount = participants.filter(
    (p) => getParticipantActivityState(p) === 'ACTIVE_SPEAKING'
  ).length;
  const mutedCount = participants.filter(
    (p) => getParticipantActivityState(p) === 'AUDIO_MUTED'
  ).length;
  const handRaisedCount = participants.filter((p) => p.isHandRaised).length;
  const leaderCount = participants.filter(
    (p) => p.role === 'PRAYER_LEADER' || p.role === 'OWNER' || p.role === 'ADMIN'
  ).length;

  const filtered = (participants || []).filter((p) => {
    if (!p) return false;
    const match =
      (p.displayName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.country && p.country.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!match) return false;

    if (activeFilterTab === 'ACTIVE_SPEAKING') {
      return getParticipantActivityState(p) === 'ACTIVE_SPEAKING';
    }
    if (activeFilterTab === 'MUTED') {
      return getParticipantActivityState(p) === 'AUDIO_MUTED';
    }
    if (activeFilterTab === 'HAND_RAISED') {
      return !!p.isHandRaised;
    }
    if (activeFilterTab === 'PRAYER_LEADER') {
      return p.role === 'PRAYER_LEADER' || p.role === 'OWNER' || p.role === 'ADMIN';
    }

    return true;
  });

  const selectedParticipant = participants.find((p) => p.id === selectedParticipantId) || null;

  const detailBreadcrumbs = [
    { label: 'Participants', path: '/dashboard/participants' },
    { label: selectedParticipant?.displayName || 'Participant', isCurrent: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
              Congregation & Team Directory
            </h1>
            <DevelopmentPreviewBadge size="sm" />
          </div>
          <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] mt-1">
            Manage prayer participants, leaders, roles, and development preview states.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-auto flex-wrap">
          <button
            onClick={() => setShowMatrixModal(true)}
            type="button"
            className="px-3.5 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] font-semibold text-xs text-[#203C32] dark:text-[#E8D8B2] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer shadow-2xs"
          >
            <Shield className="w-3.5 h-3.5 text-[#C9A35A]" />
            <span>Role Matrix</span>
          </button>

          <button
            onClick={() => setShowInviteTeamModal(true)}
            type="button"
            className="px-4 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Invite Team Member</span>
          </button>
        </div>
      </div>

      {/* Real-time Status Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total In Gathering */}
        <div
          onClick={() => setActiveFilterTab('ALL')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilterTab === 'ALL'
              ? 'bg-[#203C32]/5 dark:bg-[#C9A35A]/10 border-[#203C32] dark:border-[#C9A35A]'
              : 'bg-white dark:bg-[#17221D] border-[#E5E6E1] dark:border-[#26362F] hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between text-[#68736D] dark:text-[#96A39D]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total In Room</span>
            <Users className="w-4 h-4 text-[#203C32] dark:text-[#C9A35A]" />
          </div>
          <h3 className="text-2xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] mt-1.5">
            {totalCount}
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Connected listeners
          </p>
        </div>

        {/* Active Speaking */}
        <div
          onClick={() => setActiveFilterTab('ACTIVE_SPEAKING')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilterTab === 'ACTIVE_SPEAKING'
              ? 'bg-emerald-500/10 border-emerald-500'
              : 'bg-white dark:bg-[#17221D] border-[#E5E6E1] dark:border-[#26362F] hover:border-emerald-300'
          }`}
        >
          <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Speaker Preview</span>
            <Mic className="w-4 h-4" />
          </div>
          <h3 className="text-2xl font-extrabold text-emerald-700 dark:text-emerald-400 mt-1.5 flex items-center gap-1.5">
            <span>{speakingCount}</span>
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Configured speakers
          </p>
        </div>

        {/* Audio Muted */}
        <div
          onClick={() => setActiveFilterTab('MUTED')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilterTab === 'MUTED'
              ? 'bg-amber-500/10 border-amber-500'
              : 'bg-white dark:bg-[#17221D] border-[#E5E6E1] dark:border-[#26362F] hover:border-amber-300'
          }`}
        >
          <div className="flex items-center justify-between text-amber-700 dark:text-amber-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Audio Muted</span>
            <VolumeX className="w-4 h-4" />
          </div>
          <h3 className="text-2xl font-extrabold text-amber-700 dark:text-amber-400 mt-1.5">
            {mutedCount}
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Configured listeners
          </p>
        </div>

        {/* Raised Hands Queue */}
        <div
          onClick={() => setActiveFilterTab('HAND_RAISED')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer ${
            activeFilterTab === 'HAND_RAISED'
              ? 'bg-[#C9A35A]/15 border-[#C9A35A]'
              : 'bg-white dark:bg-[#17221D] border-[#E5E6E1] dark:border-[#26362F] hover:border-[#C9A35A]/50'
          }`}
        >
          <div className="flex items-center justify-between text-[#C9A35A]">
            <span className="text-[11px] font-bold uppercase tracking-wider">Hands Raised</span>
            <Hand className="w-4 h-4" />
          </div>
          <h3 className="text-2xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] mt-1.5">
            {handRaisedCount}
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Intercession queue
          </p>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white dark:bg-[#17221D] p-3.5 sm:p-4 rounded-2xl border border-[#E5E6E1] dark:border-[#26362F] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search directory by name, country, or keyword..."
            className="w-full pl-10 pr-4 py-2 text-xs rounded-xl bg-[#F8F7F3]/70 dark:bg-[#101814] text-[#16251F] dark:text-[#F8F7F3] border border-transparent focus:border-[#203C32] dark:focus:border-[#C9A35A] focus:outline-none"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { id: 'ALL', label: `All (${totalCount})` },
            { id: 'ACTIVE_SPEAKING', label: `🎙️ Speakers (${speakingCount})` },
            { id: 'MUTED', label: `🔇 Muted (${mutedCount})` },
            { id: 'HAND_RAISED', label: `✋ Hands Raised (${handRaisedCount})` },
            { id: 'PRAYER_LEADER', label: `🛡️ Leaders (${leaderCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilterTab(tab.id as FilterTab)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                activeFilterTab === tab.id
                  ? 'bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]'
                  : 'text-[#68736D] dark:text-[#96A39D] hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white dark:bg-[#17221D] rounded-3xl border border-[#E5E6E1] dark:border-[#26362F] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F8F7F3] dark:bg-[#101814] text-xs font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D] border-b border-[#E5E6E1] dark:border-[#26362F]">
              <tr>
                <th className="px-6 py-4">Participant Name</th>
                <th className="px-6 py-4">Current Role</th>
                <th className="px-6 py-4">Audio Status</th>
                <th className="px-6 py-4">Connection Signal</th>
                <th className="px-6 py-4 text-right">Moderation Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E6E1] dark:divide-[#26362F]">
              {filtered.map((p) => (
                <ParticipantRow
                  key={p.id}
                  participant={p}
                  onInviteToSpeak={(id) => inviteSpeaker(id)}
                  onMute={(id) => muteParticipant(id)}
                  onMakePrayerLeader={(id) => assignRole(id, 'PRAYER_LEADER')}
                  onReturnToListener={(id) => assignRole(id, 'LISTENER')}
                  onRemove={(id) => removeParticipant(id)}
                  onOpenDetail={setSelectedParticipantId}
                />
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-xs text-[#68736D] dark:text-[#96A39D]">
                    <div className="max-w-xs mx-auto space-y-1">
                      <p className="font-bold text-sm text-[#16251F] dark:text-[#F8F7F3]">No participants match filter</p>
                      <p>Try selecting a different filter tab or clearing your search keywords.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Real-time Telemetry & Audio Isolation Note */}
      <div className="p-4 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] flex items-start gap-3 text-xs text-[#68736D] dark:text-[#96A39D]">
        <Info className="w-4 h-4 text-[#203C32] dark:text-[#C9A35A] shrink-0 mt-0.5" />
        <div>
          <strong className="text-[#16251F] dark:text-[#F8F7F3] font-semibold">Listener microphone policy:</strong>
          <span className="ml-1">
            Listeners are configured to join without microphone or camera publishing permission. Server-enforced media permissions activate with the realtime media engine.
          </span>
        </div>
      </div>

      {selectedParticipant && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="participant-detail-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E5E6E1] dark:border-[#26362F]">
            <div className="flex flex-col gap-2 pb-4 border-b border-[#E5E6E1] dark:border-[#26362F]">
              <BackButton
                label="Back to Participants"
                mobileLabel="Back"
                onClick={() => setSelectedParticipantId(null)}
              />
              <Breadcrumbs items={detailBreadcrumbs} onNavigate={() => setSelectedParticipantId(null)} />
              <h2 id="participant-detail-title" className="text-xl font-bold text-[#16251F] dark:text-[#F8F7F3]">
                {selectedParticipant.displayName}
              </h2>
              <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
                Participant configuration and development preview states.
              </p>
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs text-[#68736D] dark:text-[#96A39D]">Role</span>
                <RoleBadge role={selectedParticipant.role} size="sm" />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#68736D] dark:text-[#96A39D]">Audio</span>
                <RealtimeStatusIndicator participant={selectedParticipant} />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-[#68736D] dark:text-[#96A39D]">Connection</span>
                <ConnectionStatus status={selectedParticipant.connectionQuality} preview />
              </div>
              <DevelopmentPreviewBadge size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* Role Capability Matrix Modal */}
      {showMatrixModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E6E1] dark:border-[#26362F]">
              <div>
                <h3 className="text-lg font-bold text-[#16251F] dark:text-[#F8F7F3]">
                  Sanctum Role Capability Matrix
                </h3>
                <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
                  Defined church hierarchy ensuring order during corporate gatherings
                </p>
              </div>
              <button
                onClick={() => setShowMatrixModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              {(Object.keys(ROLE_CAPABILITIES) as Role[]).map((role) => {
                const caps = ROLE_CAPABILITIES[role];
                return (
                  <div
                    key={role}
                    className="p-4 rounded-2xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <RoleBadge role={role} size="md" />
                      <span className="text-[11px] text-gray-500 font-mono">
                        {caps.canSpeakAutomatically ? 'Speaks Automatically' : 'Muted on Entry'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[#68736D] dark:text-[#96A39D] mt-2">
                      <div>Speaks Automatically: {caps.canSpeakAutomatically ? '✅ Yes' : '❌ No'}</div>
                      <div>Invite Speakers: {caps.canInviteSpeakers ? '✅ Yes' : '❌ No'}</div>
                      <div>Mute Speakers: {caps.canMuteSpeakers ? '✅ Yes' : '❌ No'}</div>
                      <div>End Session: {caps.canEndSessions ? '✅ Yes' : '❌ No'}</div>
                      <div>Manage Rooms: {caps.canManageRooms ? '✅ Yes' : '❌ No'}</div>
                      <div>Pastoral Requests: {caps.canViewPrivateRequests ? '✅ Yes' : '❌ No'}</div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 pt-4 border-t border-[#E5E6E1] dark:border-[#26362F] flex justify-end">
              <button
                onClick={() => setShowMatrixModal(false)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814]"
              >
                Close Matrix
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invite Team Modal */}
      <InviteTeamModal
        isOpen={showInviteTeamModal}
        onClose={() => setShowInviteTeamModal(false)}
      />
    </div>
  );
};
