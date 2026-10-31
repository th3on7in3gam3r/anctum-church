import React, { useEffect, useRef, useState } from 'react';
import { Users, ChevronDown, Mic } from 'lucide-react';
import { formatNumber, cn } from '../../lib/utils';

export interface PrayingName {
  id: string;
  displayName: string;
  role?: string;
}

interface ParticipantCountProps {
  count?: number | null;
  suffix?: string;
  emptyLabel?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  names?: PrayingName[];
  localParticipantId?: string | null;
}

function roleLabel(role?: string): string | null {
  if (role === 'SPEAKER') return 'Praying aloud';
  if (role === 'OWNER' || role === 'ADMIN' || role === 'PRAYER_LEADER') return 'Prayer leader';
  return null;
}

export const ParticipantCount: React.FC<ParticipantCountProps> = ({
  count,
  suffix = 'praying together',
  emptyLabel = 'Waiting for participants',
  className,
  size = 'md',
  names,
  localParticipantId,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const sizeClasses = {
    sm: 'text-xs gap-1.5 py-0.5 px-2',
    md: 'text-sm gap-2 py-1 px-3',
    lg: 'text-base gap-2.5 py-1.5 px-4',
  };
  const hasPresence = typeof count === 'number' && count > 0;
  const canOpen = Boolean(names && hasPresence);
  const people = (names || []).filter((person) => person.displayName?.trim());
  const extra = hasPresence ? Math.max(0, (count as number) - people.length) : 0;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const badge = (
    <>
      <Users className="w-4 h-4 text-[#3D6655] dark:text-[#C9A35A] shrink-0" />
      <span>
        {hasPresence ? (
          <>
            <strong className="font-semibold">{formatNumber(count)}</strong>{' '}
            <span className="text-[#68736D] dark:text-[#96A39D]">{suffix}</span>
          </>
        ) : (
          <span className="text-[#68736D] dark:text-[#96A39D]">{emptyLabel}</span>
        )}
      </span>
      {canOpen ? (
        <ChevronDown className={cn('w-3.5 h-3.5 text-[#68736D] dark:text-[#96A39D] transition-transform', open && 'rotate-180')} />
      ) : null}
    </>
  );

  const classes = cn(
    'inline-flex items-center rounded-full bg-[#16251F]/5 dark:bg-[#F8F7F3]/10 text-[#203C32] dark:text-[#E8D8B2] font-medium border border-[#E5E6E1] dark:border-[#26362F]',
    sizeClasses[size],
    className
  );

  if (!canOpen) {
    return <div className={classes}>{badge}</div>;
  }

  return (
    <div ref={rootRef} className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(classes, 'cursor-pointer hover:bg-[#16251F]/10 dark:hover:bg-[#F8F7F3]/15 transition-colors')}
      >
        {badge}
      </button>
      {open && (
        <div
          role="listbox"
          className="absolute right-0 top-full z-30 mt-2 w-64 max-h-64 overflow-y-auto rounded-2xl border border-[#E5E6E1] dark:border-[#26362F] bg-white dark:bg-[#17221D] shadow-xl text-left p-2"
        >
          <p className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-[#68736D] dark:text-[#96A39D]">
            Praying with you
          </p>
          {people.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[#68736D] dark:text-[#96A39D]">Names will appear as people join.</p>
          ) : (
            <ul className="space-y-0.5">
              {people.map((person) => {
                const isYou = person.id === localParticipantId;
                const label = roleLabel(person.role);
                return (
                  <li
                    key={person.id}
                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl text-xs text-[#16251F] dark:text-[#F8F7F3]"
                  >
                    <span className="font-medium truncate">
                      {person.displayName}
                      {isYou ? <span className="text-[#68736D] dark:text-[#96A39D] font-normal"> (you)</span> : null}
                    </span>
                    {label ? (
                      <span className="inline-flex items-center gap-1 shrink-0 text-[10px] font-semibold text-[#203C32] dark:text-[#C9A35A]">
                        {person.role === 'SPEAKER' ? <Mic className="w-3 h-3" /> : null}
                        {label}
                      </span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
          {extra > 0 ? (
            <p className="px-2 pt-1 text-[11px] text-[#68736D] dark:text-[#96A39D]">
              +{formatNumber(extra)} more connecting
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
};
