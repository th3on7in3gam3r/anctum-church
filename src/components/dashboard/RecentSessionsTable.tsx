import React from 'react';
import { PrayerSession } from '../../types';
import { formatTime, formatNumber } from '../../lib/utils';
import { Radio, Users, CheckCircle, ArrowRight } from 'lucide-react';

interface RecentSessionsTableProps {
  sessions: PrayerSession[];
  onViewSessionDetails?: (session: PrayerSession) => void;
}

export const RecentSessionsTable: React.FC<RecentSessionsTableProps> = ({
  sessions,
  onViewSessionDetails,
}) => {
  return (
    <div className="bg-card rounded-3xl border border-line shadow-xs overflow-hidden">
      <div className="p-6 border-b border-line flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-ink">
            Recent Prayer Gatherings
          </h3>
          <p className="text-xs text-muted">
            Corporate session logs and historical metrics
          </p>
        </div>
      </div>

      {sessions.length === 0 ? (
        <div className="px-6 py-12">
          <p className="text-sm text-center text-muted">
            Completed gatherings will appear here after you end a live prayer session.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
          <thead className="bg-paper text-xs font-bold uppercase tracking-wider text-muted border-b border-line">
            <tr>
              <th className="px-6 py-4">Prayer Session</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Duration</th>
              <th className="px-6 py-4">Total Unique</th>
              <th className="px-6 py-4">Peak Concurrent</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sessions.map((s) => {
              const dateStr = s.startedAt
                ? new Intl.DateTimeFormat('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  }).format(new Date(s.startedAt))
                : '—';

              const totalUnique = s.totalUniqueParticipants || s.totalParticipants || 0;
              const peakConcurrent = s.peakConcurrentParticipants || s.peakParticipants || 0;

              return (
                <tr
                  key={s.id}
                  className="hover:bg-gray-50/70 dark:hover:bg-white/5 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-green/10 dark:bg-gold/15 text-green dark:text-gold flex items-center justify-center font-bold">
                        <Radio className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="font-bold text-ink">
                          {s.roomName}
                        </div>
                        <div className="text-xs text-muted">
                          {s.activeSpeakerName ? `Led by ${s.activeSpeakerName}` : '—'}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-muted whitespace-nowrap">
                    {dateStr}
                  </td>

                  <td className="px-6 py-4 font-mono text-xs font-semibold text-ink">
                    {formatTime(s.durationSeconds)}
                  </td>

                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5 font-semibold text-green dark:text-soft">
                      <Users className="w-3.5 h-3.5 text-gold" />
                      <span>{formatNumber(totalUnique)}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-xs font-medium text-muted">
                    {formatNumber(peakConcurrent)} peak
                  </td>

                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-800 dark:text-emerald-300">
                      <CheckCircle className="w-3 h-3" />
                      <span>{s.status === 'ENDED' || s.status === 'COMPLETED' ? 'Completed' : s.status}</span>
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => onViewSessionDetails && onViewSessionDetails(s)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-green dark:text-gold hover:underline cursor-pointer"
                    >
                      <span>View Summary</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
};
