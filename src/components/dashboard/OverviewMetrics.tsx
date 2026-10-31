import React from 'react';
import { Clock, Users, FileText, Radio } from 'lucide-react';
import { formatNumber } from '../../lib/utils';

interface OverviewMetricsProps {
  totalRooms: number;
  activeRequests: number;
  peopleReached: number;
  totalPrayerHours: number | string;
}

export const OverviewMetrics: React.FC<OverviewMetricsProps> = ({
  totalRooms,
  activeRequests,
  peopleReached,
  totalPrayerHours,
}) => {
  const metrics = [
    {
      label: 'Prayer Rooms',
      value: totalRooms,
      subtext: 'Active gathering altars',
      icon: Radio,
      color: 'text-green dark:text-soft',
      bg: 'bg-green/10 dark:bg-green/30',
    },
    {
      label: 'People Reached',
      value: formatNumber(peopleReached),
      subtext: 'Congregants praying together',
      icon: Users,
      color: 'text-gold',
      bg: 'bg-gold/15',
    },
    {
      label: 'Prayer Requests',
      value: activeRequests,
      subtext: 'Needs & praise reports',
      icon: FileText,
      color: 'text-emerald-700 dark:text-emerald-400',
      bg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    },
    {
      label: 'Prayer Time',
      value: `${totalPrayerHours}h`,
      subtext: 'Total duration of completed prayer sessions.',
      icon: Clock,
      color: 'text-secondary dark:text-soft',
      bg: 'bg-secondary/10 dark:bg-secondary/25',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => {
        const Icon = m.icon;
        return (
          <div
            key={i}
            className="ui-card flex items-center justify-between p-5 shadow-xs"
          >
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">
                {m.label}
              </p>
              <h3 className="text-2xl font-extrabold text-ink mt-1">
                {m.value}
              </h3>
              <p className="text-[11px] text-muted mt-0.5">
                {m.subtext}
              </p>
            </div>
            <div className={`w-12 h-12 rounded-2xl ${m.bg} ${m.color} flex items-center justify-center shrink-0`}>
              <Icon className="w-6 h-6" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
