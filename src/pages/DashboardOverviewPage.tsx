import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { OverviewMetrics } from '../components/dashboard/OverviewMetrics';
import { NextSessionCard } from '../components/dashboard/NextSessionCard';
import { RecentSessionsTable } from '../components/dashboard/RecentSessionsTable';
import { TestPrayerRoomModal } from '../components/dashboard/TestPrayerRoomModal';
import { PrePrayerCheckModal } from '../components/dashboard/PrePrayerCheckModal';
import { EmptyState } from '../components/common/EmptyState';
import { Plus, Radio, Sliders } from 'lucide-react';

interface DashboardOverviewPageProps {
  onNavigate: (path: string) => void;
}

export const DashboardOverviewPage: React.FC<DashboardOverviewPageProps> = ({
  onNavigate,
}) => {
  const { user, organization } = useAuth();
  const { prayerRooms = [], historySessions = [], liveSession, prayerRequests = [], startPrayerSession } = useApp();

  const [showTestRoomModal, setShowTestRoomModal] = useState(false);
  const [showPrePrayerModal, setShowPrePrayerModal] = useState(false);

  const activeRooms = (prayerRooms || []).filter((room) => !room.isArchived);
  const nextRoom = activeRooms[0] || null;

  const completedSessions = (historySessions || []).filter((s) => s?.status === 'ENDED' || s?.status === 'COMPLETED');
  const activeRequestsCount = (prayerRequests || []).filter((r) => r?.status === 'PENDING').length;

  const totalUniquePeopleReached = completedSessions.reduce(
    (acc, s) => acc + (s.totalUniqueParticipants || s.totalParticipants || 0),
    0
  );

  const totalDurationSeconds = completedSessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const hours = totalDurationSeconds / 3600;
  const totalPrayerHours = Number.isInteger(hours) ? String(hours) : hours.toFixed(1).replace(/\.0$/, '');

  const handleStartFromPrePrayer = (sermonLeaderName: string) => {
    if (!nextRoom) return;
    void startPrayerSession(nextRoom.id, sermonLeaderName);
    onNavigate(`/dashboard/prayer-rooms/${nextRoom.id}/control`);
  };

  return (
    <div className="space-y-8" data-tour="dashboard-welcome">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
            Good morning, {user?.name?.split(' ')[0] || 'Pastor'}
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1">
            Here's what's happening in your Sanctum Space at <strong className="text-green dark:text-gold">{organization?.name || 'Sanctum Space'}</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {nextRoom && (
            <button
              onClick={() => setShowTestRoomModal(true)}
              type="button"
              className="px-3.5 py-2.5 rounded-xl font-bold text-xs border border-green/30 dark:border-gold/40 bg-green/5 dark:bg-gold/10 text-green dark:text-soft hover:bg-green/10 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Test Room</span>
            </button>
          )}

          <button
            onClick={() => onNavigate('/dashboard/prayer-rooms/new')}
            type="button"
            data-tour="dashboard-create-room"
            className="ui-button gap-1.5 shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Create Prayer Room</span>
          </button>
        </div>
      </div>

      {/* Overview Metrics Cards */}
      <OverviewMetrics
        totalRooms={activeRooms.length}
        activeRequests={activeRequestsCount}
        peopleReached={totalUniquePeopleReached}
        totalPrayerHours={totalPrayerHours}
      />

      {nextRoom ? (
        <NextSessionCard
          room={nextRoom}
          liveSession={liveSession}
          onOpenControlRoom={(roomId) => onNavigate(`/dashboard/prayer-rooms/${roomId}/control`)}
          onOpenPublicJoin={(slug) => window.open(`${window.location.origin}/join/${slug}`, '_blank', 'noopener,noreferrer')}
          onEditRoom={(roomId) => onNavigate(`/dashboard/prayer-rooms/${roomId}/edit`)}
          onOpenTestRoom={() => setShowTestRoomModal(true)}
          onOpenPrePrayerCheck={() => setShowPrePrayerModal(true)}
        />
      ) : (
        <EmptyState
          icon={Radio}
          title="No prayer rooms yet"
          description="Create your first prayer altar to share a join link and gather your congregation."
          actionText="Create Prayer Room"
          actionDataTour="dashboard-empty-create"
          onAction={() => onNavigate('/dashboard/prayer-rooms/new')}
        />
      )}

      {/* Recent Sessions Table */}
      <RecentSessionsTable
        sessions={completedSessions}
        onViewSessionDetails={() => onNavigate(`/dashboard/history`)}
      />

      {/* Modals */}
      {nextRoom && (
        <>
          <TestPrayerRoomModal
            isOpen={showTestRoomModal}
            onClose={() => setShowTestRoomModal(false)}
            roomName={nextRoom.name}
          />

          <PrePrayerCheckModal
            isOpen={showPrePrayerModal}
            onClose={() => setShowPrePrayerModal(false)}
            room={nextRoom}
            session={liveSession}
            waitingCount={liveSession?.status === 'WAITING' ? (liveSession.listenersWaitingCount || 0) : 0}
            onStartPrayer={handleStartFromPrePrayer}
          />
        </>
      )}
    </div>
  );
};
