import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { demoApi, type DemoInfo } from '../../services/api/setupApi';

/** Demo only: sign in as one of the sample church's staff. */
export const DemoSignIn: React.FC<{ onSignedIn: () => void }> = ({ onSignedIn }) => {
  const { demo } = useAuth();
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    demoApi.info().then(setInfo).catch(() => setInfo({ enabled: false, personas: [] }));
  }, []);

  if (!info) return <p className="text-center text-sm text-muted">Loading the demo church…</p>;
  if (!info.enabled) return <p className="text-center text-sm text-danger">The demo is not available right now.</p>;

  const signIn = async (persona: string) => {
    setBusy(persona);
    setError('');
    try {
      await demo.signInAs(persona);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className="rounded-xl bg-soft/60 px-3 py-2 text-center text-xs font-semibold text-ink">
        Demo church{info.churchName ? `: ${info.churchName}` : ''}. Pick who to be — you can switch any time.
      </p>
      <ul className="space-y-2">
        {info.personas.map((persona) => (
          <li key={persona.key}>
            <button
              type="button"
              disabled={Boolean(busy)}
              onClick={() => void signIn(persona.key)}
              className="w-full min-h-14 rounded-2xl border border-line bg-card px-4 py-3 text-left cursor-pointer hover:border-green disabled:opacity-60"
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-ink">{persona.roleName}</span>
                <span className="text-xs text-muted">{busy === persona.key ? 'Signing in…' : persona.name}</span>
              </span>
              <span className="mt-0.5 block text-xs text-muted">{persona.description}</span>
            </button>
          </li>
        ))}
      </ul>
      {error ? <p className="text-center text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  );
};
