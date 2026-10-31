import React from 'react';
import { cn } from '../../lib/utils';

/** Sanctum Storehouse: a gabled storehouse with an arched door. */
export const StorehouseMark: React.FC<{ className?: string; tone?: 'dark' | 'light' }> = ({ className, tone = 'dark' }) => {
  const fill = tone === 'dark' ? '#16251F' : '#F8F7F3';
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" className={cn('h-9 w-9 shrink-0', className)}>
      <rect width="40" height="40" rx="11" fill={fill} />
      <path d="M8 18.5 20 9l12 9.5" fill="none" stroke="#C9A35A" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 17v14h17V17" fill="none" stroke={tone === 'dark' ? '#F8F7F3' : '#16251F'} strokeWidth="2.4" strokeLinejoin="round" />
      <path d="M17 31v-6a3 3 0 0 1 6 0v6" fill="#C9A35A" />
    </svg>
  );
};

export const StorehouseLogo: React.FC<{ className?: string; tone?: 'dark' | 'light'; showTagline?: boolean }> = ({
  className,
  tone = 'dark',
  showTagline = false,
}) => (
  <span className={cn('inline-flex items-center gap-2.5', className)}>
    <StorehouseMark tone={tone} />
    <span className="leading-tight">
      <span className={cn('block font-display text-[1.35rem] tracking-[-0.01em]', tone === 'dark' ? 'text-[#16251F]' : 'text-[#F8F7F3]')}>
        Sanctum <span className="italic text-[#8A6A2B]" style={tone === 'light' ? { color: '#E4C98F' } : undefined}>Storehouse</span>
      </span>
      {showTagline ? (
        <span className={cn('block text-xs', tone === 'dark' ? 'text-[#3E5148]' : 'text-[#D5CBB8]')}>Your whole church, in one place</span>
      ) : null}
    </span>
  </span>
);
