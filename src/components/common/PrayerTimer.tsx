import React from 'react';
import { Clock } from 'lucide-react';
import { formatTime, cn } from '../../lib/utils';

interface PrayerTimerProps {
  seconds: number;
  label?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const PrayerTimer: React.FC<PrayerTimerProps> = ({
  seconds,
  label = 'Elapsed',
  className,
  size = 'md',
}) => {
  const sizeClasses = {
    sm: 'text-xs gap-1.5 font-mono',
    md: 'text-sm gap-2 font-mono',
    lg: 'text-lg gap-2.5 font-mono',
  };

  return (
    <div
      className={cn(
        'inline-flex items-center text-[#203C32] dark:text-[#E8D8B2]',
        sizeClasses[size],
        className
      )}
    >
      <Clock className="w-4 h-4 text-[#C9A35A] shrink-0" />
      {label && <span className="text-[#68736D] dark:text-[#96A39D] font-sans text-xs uppercase">{label}:</span>}
      <span className="font-semibold tracking-wider">{formatTime(seconds)}</span>
    </div>
  );
};
