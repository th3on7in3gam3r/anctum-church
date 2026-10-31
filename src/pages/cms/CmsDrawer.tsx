import React from 'react';
import { X } from 'lucide-react';

export const fieldClass = 'ui-field';
export const labelClass = 'mb-1.5 block text-[11px] font-bold uppercase tracking-wide text-muted';
export const primaryButtonClass = 'ui-button';

export function SampleBadge() {
  return (
    <span className="inline-flex items-center rounded-full bg-gold/25 px-2 py-0.5 text-[10px] font-bold tracking-wide text-ink dark:text-gold">
      Sample content — replace before launch
    </span>
  );
}

export const CmsListRow: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="ui-card w-full cursor-pointer p-4 text-left">
    {children}
  </button>
);

export function CmsPageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{title}</h1>
        <p className="mt-1 text-xs text-muted sm:text-sm">{description}</p>
      </div>
      {action}
    </div>
  );
}

export const CmsDrawer: React.FC<{
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ open, title, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40">
      <button type="button" aria-label="Close" className="flex-1 cursor-default" onClick={onClose} />
      <aside className="ui-card h-full w-full max-w-md overflow-y-auto rounded-none border-y-0 border-r-0 p-5 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button type="button" onClick={onClose} className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        {children}
      </aside>
    </div>
  );
};
