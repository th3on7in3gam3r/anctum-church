import React from 'react';
import { cn } from '../../lib/utils';
import { Sparkles } from 'lucide-react';

interface DevelopmentPreviewBadgeProps {
  className?: string;
  size?: 'xs' | 'sm';
}

export const DevelopmentPreviewBadge: React.FC<DevelopmentPreviewBadgeProps> = ({
  className,
  size = 'xs',
}) => {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-bold uppercase tracking-wider rounded-md border',
        'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/25',
        size === 'xs' ? 'px-1.5 py-0.5 text-[9px]' : 'px-2 py-0.5 text-[10px]',
        className
      )}
      title="This data is a development preview ahead of LiveKit Phase 1B media connection"
    >
      <Sparkles className={size === 'xs' ? 'w-2.5 h-2.5' : 'w-3 h-3'} />
      <span>Development Preview</span>
    </span>
  );
};
