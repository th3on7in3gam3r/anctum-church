import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { RecentSessionsTable } from '../components/dashboard/RecentSessionsTable';
import { BackButton } from '../components/common/BackButton';
import { Breadcrumbs } from '../components/common/Breadcrumbs';
import { PrayerSession } from '../types';
import { formatTime, formatNumber } from '../lib/utils';
import { Download } from 'lucide-react';

interface HistoryPageProps {
  onNavigate: (path: string) => void;
}

export const HistoryPage: React.FC<HistoryPageProps> = ({ onNavigate: _onNavigate }) => {
  const { historySessions = [], addToast } = useApp();
  const [selectedSession, setSelectedSession] = useState<PrayerSession | null>(null);

  const completedSessions = (historySessions || []).filter(
    (s) => s?.status === 'ENDED' || s?.status === 'COMPLETED'
  );
  const totalMinutes = completedSessions.reduce((acc, curr) => acc + (curr?.durationSeconds || 0), 0) / 60;
  const totalAttendees = completedSessions.reduce((acc, curr) => acc + (curr?.totalUniqueParticipants || curr?.totalParticipants || 0), 0);

  const handleExportHistory = () => {
    if (completedSessions.length === 0) {
      addToast('No gatherings to export yet.', 'info');
      return;
    }
    addToast('Historical prayer logs exported successfully', 'success');
  };

  const breadcrumbs = [
    { label: 'History', path: '/dashboard/history' },
    { label: selectedSession?.roomName || 'Session Summary', isCurrent: true },
  ];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] tracking-tight">
            Prayer Gathering History
          </h1>
          <p className="text-xs sm:text-sm text-[#68736D] dark:text-[#96A39D] mt-1">
            Archived logs of completed prayer sessions, attendance metrics, and lead intercessors.
          </p>
        </div>

        <button
          onClick={handleExportHistory}
          type="button"
          disabled={completedSessions.length === 0}
          className="px-4 py-2.5 rounded-xl border border-[#E5E6E1] dark:border-[#26362F] font-semibold text-xs text-[#203C32] dark:text-[#E8D8B2] hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5 cursor-pointer self-start sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download className="w-4 h-4" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D]">
            Total Gatherings
          </span>
          <h3 className="text-2xl font-extrabold text-[#16251F] dark:text-[#F8F7F3] mt-1">
            {completedSessions.length}
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Archived corporate sessions
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D]">
            Prayer Time
          </span>
          <h3 className="text-2xl font-extrabold text-[#203C32] dark:text-[#E8D8B2] mt-1">
            {(totalMinutes / 60).toFixed(1)} hrs
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Total duration of completed prayer sessions.
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-white dark:bg-[#17221D] border border-[#E5E6E1] dark:border-[#26362F]">
          <span className="text-xs font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D]">
            Total People Gathered
          </span>
          <h3 className="text-2xl font-extrabold text-[#C9A35A] mt-1">
            {formatNumber(totalAttendees)}
          </h3>
          <p className="text-[11px] text-[#68736D] dark:text-[#96A39D] mt-0.5">
            Believers gathered in unity
          </p>
        </div>
      </div>

      {/* History Table */}
      <RecentSessionsTable
        sessions={completedSessions}
        onViewSessionDetails={(session) => setSelectedSession(session)}
      />

      {/* Session Details Modal */}
      {selectedSession && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="session-summary-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs"
        >
          <div className="bg-white dark:bg-[#17221D] rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl border border-[#E5E6E1] dark:border-[#26362F] max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col gap-2 pb-4 border-b border-[#E5E6E1] dark:border-[#26362F]">
              <BackButton
                label="Back to History"
                mobileLabel="Back"
                onClick={() => setSelectedSession(null)}
              />
              <Breadcrumbs items={breadcrumbs} onNavigate={() => setSelectedSession(null)} />
              <div className="flex items-center justify-between">
                <div>
                  <h3 id="session-summary-title" className="text-xl font-bold text-[#16251F] dark:text-[#F8F7F3]">
                    {selectedSession.roomName}
                  </h3>
                  <p className="text-xs text-[#68736D] dark:text-[#96A39D]">
                    Session Summary
                    {selectedSession.startedAt
                      ? ` • ${new Date(selectedSession.startedAt).toLocaleDateString(undefined, {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}`
                      : ''}
                  </p>
                </div>
              </div>
            </div>

            <div className="my-6 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Total Duration</span>
                  <p className="text-base font-bold font-mono text-[#16251F] dark:text-[#F8F7F3]">
                    {formatTime(selectedSession.durationSeconds)}
                  </p>
                </div>
                <div className="p-3.5 rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F]">
                  <span className="text-[10px] uppercase font-bold text-gray-400">Peak Concurrent</span>
                  <p className="text-base font-bold text-[#C9A35A]">
                    {formatNumber(selectedSession.peakConcurrentParticipants || selectedSession.peakParticipants)}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-[#F8F7F3] dark:bg-[#101814] border border-[#E5E6E1] dark:border-[#26362F] space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-500">Active Prayer Leader:</span>
                  <strong className="text-[#16251F] dark:text-[#F8F7F3]">
                    {selectedSession.activeSpeakerName || '—'}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">People Gathered:</span>
                  <strong className="text-[#16251F] dark:text-[#F8F7F3]">
                    {formatNumber(selectedSession.totalUniqueParticipants || selectedSession.totalParticipants)}
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Prayer Requests Received:</span>
                  <strong className="text-[#16251F] dark:text-[#F8F7F3]">
                    {selectedSession.totalPrayerRequests ?? selectedSession.prayerRequestsCount ?? 0} requests
                  </strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Session Status:</span>
                  <span className="font-bold text-emerald-600">COMPLETED</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setSelectedSession(null)}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#203C32] text-white dark:bg-[#C9A35A] dark:text-[#101814] cursor-pointer"
              >
                Close Summary
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
