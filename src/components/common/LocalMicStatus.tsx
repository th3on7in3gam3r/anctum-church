import React, { useEffect, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { livekitRealtimeProvider } from '../../services/realtime/livekitRealtimeProvider';
import { cn } from '../../lib/utils';

type MicUiState = 'offline' | 'locked' | 'ready' | 'live';

interface LocalMicStatusProps {
  /** When true, this person is not allowed to publish yet (congregation muted). */
  locked?: boolean;
  /** Compact pill for headers; default is a fuller status card. */
  compact?: boolean;
  className?: string;
}

/**
 * Shows whether THIS browser tab is actually sending microphone audio,
 * with a live level meter so dual-tab testing is obvious.
 */
export const LocalMicStatus: React.FC<LocalMicStatusProps> = ({
  locked = false,
  compact = false,
  className,
}) => {
  const [publishing, setPublishing] = useState(false);
  const [muted, setMuted] = useState(true);
  const [connected, setConnected] = useState(false);
  const [level, setLevel] = useState(0);

  useEffect(() => {
    const tick = () => {
      const status = livekitRealtimeProvider.getLocalMicStatus();
      setConnected(status.connected);
      setPublishing(status.publishing);
      setMuted(status.muted);
      setLevel(status.level);
    };
    tick();
    const timer = window.setInterval(tick, 120);
    const unsubscribe = livekitRealtimeProvider.subscribe(tick);
    return () => {
      window.clearInterval(timer);
      unsubscribe();
    };
  }, []);

  const live = connected && publishing && !muted;
  const state: MicUiState = !connected
    ? 'offline'
    : locked && !live
      ? 'locked'
      : live
        ? 'live'
        : 'ready';

  const label =
    state === 'offline'
      ? 'Mic offline'
      : state === 'locked'
        ? 'Mic locked'
        : state === 'live'
          ? 'Your mic is live'
          : 'Mic ready — tap unmute';

  const bars = [0.2, 0.4, 0.65, 0.9, 0.55].map((threshold, index) => {
    const active = live && level >= threshold * 0.35 + index * 0.08;
    return (
      <span
        key={index}
        className={cn(
          'w-1 rounded-full transition-all duration-75',
          compact ? 'h-3' : 'h-4',
          active ? 'bg-emerald-500' : 'bg-current opacity-25'
        )}
        style={live ? { height: `${Math.max(25, Math.min(100, level * 100 + index * 8))}%` } : undefined}
      />
    );
  });

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full border font-bold uppercase tracking-wider',
        compact ? 'px-2.5 py-1 text-[10px]' : 'px-3 py-1.5 text-[11px]',
        state === 'live'
          ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-800 dark:text-emerald-300'
          : state === 'locked'
            ? 'border-[#B94A48]/30 bg-[#B94A48]/10 text-[#B94A48]'
            : state === 'ready'
              ? 'border-[#203C32]/20 bg-[#203C32]/8 text-[#203C32] dark:border-[#C9A35A]/30 dark:bg-[#C9A35A]/10 dark:text-[#E8D8B2]'
              : 'border-[#E5E6E1] dark:border-[#26362F] bg-black/5 dark:bg-white/5 text-[#68736D] dark:text-[#96A39D]',
        className
      )}
      title={
        live
          ? 'This browser tab is sending microphone audio right now.'
          : locked
            ? 'The pastor has not opened the floor for prayer yet.'
            : connected
              ? 'Connected, but this tab is not sending mic audio.'
              : 'Not connected to prayer audio.'
      }
      aria-live="polite"
    >
      {state === 'live' ? <Mic className="w-3.5 h-3.5 shrink-0" /> : <MicOff className="w-3.5 h-3.5 shrink-0" />}
      <span>{label}</span>
      <span className="inline-flex items-end gap-0.5 h-4 ml-0.5" aria-hidden>
        {bars}
      </span>
    </div>
  );
};
