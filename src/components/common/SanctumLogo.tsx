import React from 'react';
import { cn } from '../../lib/utils';

interface SanctumLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTagline?: boolean;
  className?: string;
}

export const SanctumLogo: React.FC<SanctumLogoProps> = ({
  size = 'md',
  showTagline = false,
  className,
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  };

  const textSizes = {
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  };

  return (
    <div className={cn('inline-flex items-center gap-3 select-none', className)}>
      {/* Geometric Arch & Sanctuary Sound Mark */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-t-full border border-gold',
          iconSizes[size]
        )}
      >
        <div className="flex items-end gap-0.5 pb-1">
          <div className="h-2 w-0.5 rounded-full bg-gold"></div>
          <div className="h-3.5 w-0.5 rounded-full bg-gold"></div>
          <div className="h-2.5 w-0.5 rounded-full bg-green dark:bg-soft"></div>
          <div className="h-2 w-0.5 rounded-full bg-gold"></div>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="flex items-baseline gap-1.5 leading-none">
          <span className={cn('font-semibold tracking-tight text-green dark:text-ink', textSizes[size])}>
            Sanctum
          </span>
          <span className={cn('font-normal text-gold', textSizes[size])}>
            Live
          </span>
        </div>
        {showTagline && (
          <span className="mt-1 text-xs text-muted">
            Prayer without barriers
          </span>
        )}
      </div>
    </div>
  );
};
