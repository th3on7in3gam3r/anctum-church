import React from 'react';
import { cn } from '../../lib/utils';

const SIZES = {
  sm: { box: 'h-9 w-9 text-sm', name: 'text-base' },
  md: { box: 'h-11 w-11 text-base', name: 'text-xl' },
  lg: { box: 'h-14 w-14 text-xl', name: 'text-2xl' },
} as const;

function initials(name: string): string {
  const words = name.replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : (words[0] || '?').slice(0, 2);
  return letters.toUpperCase();
}

/** The church's own logo and name, as set in Church setup › Brand. */
export const ChurchBadge: React.FC<{
  name: string;
  logoUrl?: string | null;
  subline?: string | null;
  size?: keyof typeof SIZES;
  variant?: 'full' | 'mark';
  className?: string;
}> = ({ name, logoUrl, subline, size = 'sm', variant = 'full', className }) => {
  const sizes = SIZES[size];
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-3', className)}>
      {logoUrl ? (
        <img src={logoUrl} alt="" className={cn('shrink-0 rounded-xl object-cover', sizes.box)} />
      ) : (
        <span aria-hidden="true" className={cn('flex shrink-0 items-center justify-center rounded-xl bg-green font-bold text-white dark:bg-gold dark:text-[#101814]', sizes.box)}>
          {initials(name)}
        </span>
      )}
      {variant === 'full' ? (
        <span className="min-w-0">
          <span className={cn('block truncate font-display leading-tight text-ink', sizes.name)}>{name}</span>
          {subline ? <span className="block truncate text-[11px] font-semibold uppercase tracking-wide text-muted">{subline}</span> : null}
        </span>
      ) : null}
    </span>
  );
};
