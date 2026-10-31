import React from 'react';
import { ConnectionQuality } from '../../types';
import { cn } from '../../lib/utils';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';

interface ConnectionStatusProps {
  status?: ConnectionQuality;
  showLabel?: boolean;
  className?: string;
  /** Simulated media/connection state ahead of LiveKit. */
  preview?: boolean;
  /** True when this is a browser internet check, not realtime-media health. */
  basicNetworkCheck?: boolean;
  /** True when LiveKit is actually connected. */
  live?: boolean;
}

export const ConnectionStatus: React.FC<ConnectionStatusProps> = ({
  status = 'OFFLINE',
  showLabel = true,
  className,
  preview = false,
  basicNetworkCheck = false,
  live = false,
}) => {
  const getStatusConfig = () => {
    if (live) {
      if (status === 'RECONNECTING') {
        return {
          label: 'Reconnecting to prayer…',
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          bars: 1,
          icon: AlertTriangle,
        };
      }
      if (status === 'OFFLINE') {
        return {
          label: 'Disconnected',
          color: 'text-[#B94A48] dark:text-red-400',
          bg: 'bg-[#B94A48]/10 border-[#B94A48]/20',
          bars: 0,
          icon: WifiOff,
        };
      }
      return {
        label: 'Connected',
        color: 'text-emerald-700 dark:text-emerald-300',
        bg: 'bg-emerald-500/10 border-emerald-500/20',
        bars: 4,
        icon: Wifi,
      };
    }

    if (preview) {
      return {
        label: 'Not Connected',
        color: 'text-[#68736D] dark:text-[#96A39D]',
        bg: 'bg-[#68736D]/10 border-[#68736D]/20',
        bars: 0,
        icon: WifiOff,
      };
    }

    if (basicNetworkCheck) {
      return {
        label: 'Basic Network Check',
        color: 'text-[#3D6655] dark:text-[#E8D8B2]',
        bg: 'bg-[#3D6655]/10 border-[#3D6655]/20',
        bars: 3,
        icon: Wifi,
      };
    }

    switch (status) {
      case 'EXCELLENT':
      case 'GOOD':
        return {
          label: 'Development Preview',
          color: 'text-amber-700 dark:text-amber-300',
          bg: 'bg-amber-500/10 border-amber-500/20',
          bars: 2,
          icon: Wifi,
        };
      case 'WEAK':
      case 'FAIR':
        return {
          label: 'Development Preview',
          color: 'text-amber-700 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          bars: 1,
          icon: Wifi,
        };
      case 'RECONNECTING':
        return {
          label: 'Not Connected',
          color: 'text-amber-600 dark:text-amber-400',
          bg: 'bg-amber-500/10 border-amber-500/20',
          bars: 1,
          icon: AlertTriangle,
        };
      case 'OFFLINE':
      default:
        return {
          label: 'Not Connected',
          color: 'text-[#B94A48] dark:text-red-400',
          bg: 'bg-[#B94A48]/10 border-[#B94A48]/20',
          bars: 0,
          icon: WifiOff,
        };
    }
  };

  const config = getStatusConfig();
  const Icon = config.icon;

  return (
    <div
      title={config.label}
      className={cn(
        'inline-flex items-center gap-2 px-2.5 py-1 rounded-full border text-xs font-medium',
        config.bg,
        config.color,
        className
      )}
    >
      <div className="flex items-end gap-0.5 h-3">
        {[1, 2, 3, 4].map((bar) => (
          <span
            key={bar}
            className={cn(
              'w-1 rounded-xs transition-all duration-300',
              bar <= config.bars ? 'bg-current' : 'bg-gray-300 dark:bg-gray-700'
            )}
            style={{ height: `${bar * 25}%` }}
          />
        ))}
      </div>
      {showLabel && <span>{config.label}</span>}
      {!showLabel && <Icon className="w-3.5 h-3.5" />}
    </div>
  );
};
