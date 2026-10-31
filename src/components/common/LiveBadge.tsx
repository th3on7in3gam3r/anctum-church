import React from 'react';
import { cn } from '../../lib/utils';

interface LiveBadgeProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const LiveBadge: React.FC<LiveBadgeProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1.5',
    md: 'px-2.5 py-1 text-xs gap-2',
    lg: 'px-3.5 py-1.5 text-sm gap-2.5',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div
      role="status"
      aria-label="Live broadasting session"
      className={cn(
        'inline-flex items-center font-bold tracking-wider uppercase rounded-full bg-[#D7473F]/10 dark:bg-[#D7473F]/20 text-[#D7473F] border border-[#D7473F]/20',
        sizeClasses[size],
        className
      )}
    >
      <span className="relative flex">
        <span
          className={cn(
            'absolute inline-flex h-full w-full rounded-full bg-[#D7473F] opacity-75 animate-ping',
            dotSizes[size]
          )}
        />
        <span
          className={cn(
            'relative inline-flex rounded-full bg-[#D7473F]',
            dotSizes[size]
          )}
        />
      </span>
      <span>LIVE</span>
    </div>
  );
};
