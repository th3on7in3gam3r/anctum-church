import React from 'react';

export const ComingSoonBadge: React.FC<{ label?: string }> = ({ label = 'Coming Soon' }) => (
  <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-800 dark:text-amber-300">
    {label}
  </span>
);
