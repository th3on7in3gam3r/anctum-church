import React from 'react';
import { Role } from '../../types';
import { cn } from '../../lib/utils';
import { Crown, Shield, Mic, Radio, Headphones, Sliders } from 'lucide-react';

interface RoleBadgeProps {
  role: Role;
  className?: string;
  size?: 'sm' | 'md';
}

export const RoleBadge: React.FC<RoleBadgeProps> = ({ role, className, size = 'sm' }) => {
  const getRoleConfig = () => {
    switch (role) {
      case 'OWNER':
        return {
          label: 'Senior Pastor',
          bg: 'bg-amber-500/10 text-amber-800 dark:text-amber-300 border-amber-500/30',
          icon: Crown,
        };
      case 'ADMIN':
        return {
          label: 'Admin · Room operator',
          bg: 'bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 border-emerald-500/30',
          icon: Shield,
        };
      case 'PRAYER_LEADER':
        return {
          label: 'Prayer Leader',
          bg: 'bg-[#3D6655]/15 text-[#203C32] dark:text-[#E8D8B2] border-[#3D6655]/30',
          icon: Mic,
        };
      case 'MEDIA':
        return {
          label: 'Media',
          bg: 'bg-[#C9A35A]/15 text-[#8a6a2e] dark:text-[#E4C98F] border-[#C9A35A]/40',
          icon: Radio,
        };
      case 'TECHNICAL_ADMIN':
        return {
          label: 'Technical Admin',
          bg: 'bg-slate-500/10 text-slate-800 dark:text-slate-300 border-slate-500/30',
          icon: Sliders,
        };
      case 'SPEAKER':
        return {
          label: 'Speaker',
          bg: 'bg-blue-500/10 text-blue-800 dark:text-blue-300 border-blue-500/30',
          icon: Radio,
        };
      case 'LISTENER':
      default:
        return {
          label: 'Listener',
          bg: 'bg-gray-500/10 text-gray-700 dark:text-gray-300 border-gray-500/20',
          icon: Headphones,
        };
    }
  };

  const config = getRoleConfig();
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 font-medium rounded-full border max-w-full',
        size === 'sm' ? 'px-2 py-0.5 text-[11px] leading-none' : 'px-2.5 py-1 text-sm',
        config.bg,
        className
      )}
    >
      <Icon className={cn('shrink-0', size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5')} />
      <span className="truncate whitespace-nowrap">{config.label}</span>
    </span>
  );
};
