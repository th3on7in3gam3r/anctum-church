import React, { useEffect, useState } from 'react';
import { RefreshCcw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { demoApi, type DemoInfo } from '../../services/api/setupApi';

/** Demo only: jump between the sample church's people to compare what each role sees. */
export const DemoRoleSwitcher: React.FC = () => {
  const { demo, access } = useAuth();
  const [info, setInfo] = useState<DemoInfo | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    demoApi.info().then(setInfo).catch(() => setInfo(null));
  }, []);

  if (!demo.enabled || !info?.enabled) return null;

  const current = info.personas.find((persona) => persona.roleName === access?.roleName)?.key || '';

  const switchTo = async (persona: string) => {
    if (!persona || persona === current) return;
    setBusy(true);
    setError(null);
    try {
      await demo.signInAs(persona);
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch.');
      setBusy(false);
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    try {
      await demoApi.reset();
      window.location.assign('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset.');
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gold/50 bg-soft/40 p-3 space-y-2">
      <label className="block">
        <span className="block text-[10px] font-bold uppercase tracking-wide text-muted">Demo · view as</span>
        <select
          value={current}
          disabled={busy}
          onChange={(event) => void switchTo(event.target.value)}
          className="mt-1 w-full min-h-11 rounded-xl border border-line bg-white px-2.5 py-2 text-sm font-semibold text-[#16251f]"
        >
          {current ? null : <option value="">Choose a role</option>}
          {info.personas.map((persona) => (
            <option key={persona.key} value={persona.key}>
              {persona.roleName} — {persona.name}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={() => void reset()}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted hover:text-ink cursor-pointer"
      >
        <RefreshCcw className="h-3 w-3" /> Reset demo data
      </button>
      {error ? <p className="text-[11px] font-semibold text-danger">{error}</p> : null}
    </div>
  );
};
