import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';
import { cn } from '../../lib/utils';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
  actionDataTour?: string;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Sparkles,
  title,
  description,
  actionText,
  onAction,
  actionDataTour,
  className,
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-8 md:p-12 text-center rounded-2xl border border-dashed border-[#E5E6E1] dark:border-[#26362F] bg-white/50 dark:bg-[#17221D]/50',
        className
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#203C32]/10 dark:bg-[#E8D8B2]/10 flex items-center justify-center text-[#203C32] dark:text-[#C9A35A] mb-4 shadow-xs">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-[#16251F] dark:text-[#F8F7F3] mb-1.5">{title}</h3>
      <p className="text-sm text-[#68736D] dark:text-[#96A39D] max-w-md mb-6 leading-relaxed">
        {description}
      </p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          type="button"
          data-tour={actionDataTour}
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl font-medium text-sm bg-[#203C32] hover:bg-[#16251F] text-[#F8F7F3] dark:bg-[#C9A35A] dark:hover:bg-[#D6B36E] dark:text-[#101814] shadow-sm transition-colors cursor-pointer"
        >
          {actionText}
        </button>
      )}
    </div>
  );
};
