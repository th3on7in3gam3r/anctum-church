import React from 'react';
import { Lock } from 'lucide-react';

/** Shown instead of a page the church has turned off, or the person's role can't open. */
export const NoAccessPanel: React.FC<{
  featureOff: boolean;
  label: string;
  roleName: string;
  onNavigate: (path: string) => void;
}> = ({ featureOff, label, roleName, onNavigate }) => (
  <div className="ui-card mx-auto mt-10 max-w-lg space-y-3 p-8 text-center">
    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-soft text-ink">
      <Lock className="h-5 w-5" aria-hidden="true" />
    </span>
    <h1 className="text-xl font-extrabold text-ink">{featureOff ? `${label} is turned off` : `${label} isn’t part of your role`}</h1>
    <p className="text-sm text-muted">
      {featureOff
        ? 'Your church has switched this off. A Super Admin or the church Developer can turn it on in Church setup.'
        : `Your role (${roleName}) doesn’t include this area. Ask a Super Admin if you need it.`}
    </p>
    <button type="button" className="ui-button" onClick={() => onNavigate('/dashboard')}>
      Back to overview
    </button>
  </div>
);
