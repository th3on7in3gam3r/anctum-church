import React from 'react';
import { SessionLifecycleStatus } from '../../types';
import { Calendar, Radio, Clock, CheckCircle2, XCircle, AlertCircle, Sparkles } from 'lucide-react';

interface PrayerSessionStatusProps {
  status: SessionLifecycleStatus | 'COMPLETED';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export const PrayerSessionStatus: React.FC<PrayerSessionStatusProps> = ({
  status,
  size = 'md',
  showIcon = true,
  className = '',
}) => {
  const normalizedStatus = status === 'COMPLETED' ? 'ENDED' : status;

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1 font-bold',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-bold',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-extrabold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  switch (normalizedStatus) {
    case 'LIVE':
      return (
        <span
          role="status"
          aria-label="Session is Live"
          className={`inline-flex items-center rounded-full bg-[#D7473F] text-white uppercase tracking-wider shadow-xs ${sizeClasses[size]} ${className}`}
        >
          {showIcon && (
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white" />
            </span>
          )}
          <span>LIVE</span>
        </span>
      );

    case 'WAITING':
      return (
        <span
          role="status"
          aria-label="Sanctuary is Open and Waiting"
          className={`inline-flex items-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Sparkles className={`${iconSizes[size]} text-amber-600 dark:text-amber-400 animate-pulse`} />}
          <span>Sanctuary Open</span>
        </span>
      );

    case 'SCHEDULED':
      return (
        <span
          role="status"
          aria-label="Session is Scheduled"
          className={`inline-flex items-center rounded-full bg-[#203C32]/10 dark:bg-[#C9A35A]/20 text-[#203C32] dark:text-[#E8D8B2] uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Calendar className={iconSizes[size]} />}
          <span>Upcoming</span>
        </span>
      );

    case 'ENDING':
      return (
        <span
          role="status"
          aria-label="Session is Concluding"
          className={`inline-flex items-center rounded-full bg-orange-500/15 text-orange-700 dark:text-orange-300 border border-orange-500/30 uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Clock className={`${iconSizes[size]} animate-spin`} />}
          <span>Concluding</span>
        </span>
      );

    case 'ENDED':
      return (
        <span
          role="status"
          aria-label="Session is Completed"
          className={`inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <CheckCircle2 className={iconSizes[size]} />}
          <span>Completed</span>
        </span>
      );

    case 'CANCELLED':
      return (
        <span
          role="status"
          aria-label="Session was Cancelled"
          className={`inline-flex items-center rounded-full bg-gray-200 dark:bg-white/10 text-gray-600 dark:text-gray-400 uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <XCircle className={iconSizes[size]} />}
          <span>Cancelled</span>
        </span>
      );

    case 'FAILED':
      return (
        <span
          role="status"
          aria-label="Session Encountered an Error"
          className={`inline-flex items-center rounded-full bg-red-500/15 text-red-700 dark:text-red-300 uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <AlertCircle className={iconSizes[size]} />}
          <span>Failed</span>
        </span>
      );

    case 'DRAFT':
    default:
      return (
        <span
          role="status"
          aria-label="Session is a Draft"
          className={`inline-flex items-center rounded-full bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 uppercase tracking-wider ${sizeClasses[size]} ${className}`}
        >
          {showIcon && <Clock className={iconSizes[size]} />}
          <span>Draft</span>
        </span>
      );
  }
};
