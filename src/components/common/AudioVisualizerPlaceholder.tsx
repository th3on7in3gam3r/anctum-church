import React from 'react';
import { Volume2 } from 'lucide-react';
import { cn } from '../../lib/utils';
import { LiveBadge } from './LiveBadge';

interface AudioVisualizerPlaceholderProps {
  speakerName: string;
  speakerTitle?: string;
  eyebrow?: string;
  isLive?: boolean;
  className?: string;
}

export const AudioVisualizerPlaceholder: React.FC<AudioVisualizerPlaceholderProps> = ({
  speakerName,
  speakerTitle = 'Live Prayer',
  eyebrow = 'Currently speaking',
  isLive = true,
  className,
}) => {
  return (
    <div
      className={cn(
        'sanctum-speaking relative flex flex-col items-center justify-center rounded-[32px] p-6 shadow-[var(--shadow-glow)] sm:p-10',
        className
      )}
    >
      {isLive && (
        <div className="z-10 mb-4">
          <LiveBadge size="sm" className="sanctum-chip" />
        </div>
      )}

      <div className="relative z-10 mb-5">
        <div className="sanctum-outline flex h-36 w-36 items-center justify-center rounded-full sm:h-40 sm:w-40">
          <div className="sanctum-raised flex h-28 w-28 items-center justify-center rounded-full sm:h-32 sm:w-32">
            <div className="flex h-9 items-end gap-1.5">
              <div className="sanctum-accent h-6 w-1.5 rounded-full" />
              <div className="sanctum-accent h-10 w-1.5 rounded-full" />
              <div className="sanctum-accent h-8 w-1.5 rounded-full" />
              <div className="sanctum-chip h-12 w-1.5 rounded-full" />
              <div className="sanctum-accent h-7 w-1.5 rounded-full" />
            </div>
          </div>
        </div>

        <div className="sanctum-accent absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full text-xs">
          <Volume2 className="h-4 w-4" />
        </div>
      </div>

      <div className="z-10 max-w-sm text-center">
        <span className="eyebrow mb-1 block">{eyebrow}</span>
        <h2 className="font-display text-4xl font-light tracking-tight">{speakerName}</h2>
        <p className="sanctum-muted mt-0.5 text-xs">{speakerTitle}</p>
      </div>

      <div className="sanctum-chip z-10 mt-6 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-widest">
        Prayer Audio Preview
      </div>
    </div>
  );
};
