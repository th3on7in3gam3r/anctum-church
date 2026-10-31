import React from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isCurrent?: boolean;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  onNavigate?: (path: string) => void;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  onNavigate,
  className,
}) => {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb"
      className={cn(
        'hidden md:flex items-center gap-1.5 text-xs text-[#68736D] dark:text-[#96A39D] py-1',
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-[#68736D]/40 dark:text-[#96A39D]/40 shrink-0" />
            )}
            {item.path && !isLast ? (
              <button
                type="button"
                onClick={() => onNavigate && onNavigate(item.path!)}
                className="hover:text-[#203C32] dark:hover:text-[#E8D8B2] hover:underline transition-colors font-medium focus:outline-none focus-visible:ring-1 focus-visible:ring-[#203C32] rounded"
              >
                {item.label}
              </button>
            ) : (
              <span
                className={cn(
                  isLast
                    ? 'font-semibold text-[#16251F] dark:text-[#F8F7F3]'
                    : 'font-normal'
                )}
                aria-current={isLast ? 'page' : undefined}
              >
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
