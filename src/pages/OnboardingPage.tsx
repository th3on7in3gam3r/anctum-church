import React, { useState } from 'react';
import { Show, SignInButton, UserButton } from '@clerk/react';
import { SanctumLogo } from '../components/common/SanctumLogo';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { slugify } from '../lib/utils';
import { leaveToHome } from '../lib/appMode';
import { ApiClientError, sanctumApi } from '../services/api/sanctumApi';
import { ArrowRight, Building, Sun, Moon } from 'lucide-react';
import { LogoUrlField, isHttpUrl } from '../components/common/LogoUrlField';

interface OnboardingPageProps {
  onNavigate: (path: string) => void;
}

export const OnboardingPage: React.FC<OnboardingPageProps> = ({ onNavigate }) => {
  const { clerkConfigured, isAuthenticated, refreshAuth } = useAuth();
  const { isDarkMode, toggleDarkMode, addToast } = useApp();
  const [churchName, setChurchName] = useState('');
  const [churchSlug, setChurchSlug] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleNameChange = (value: string) => {
    setChurchName(value);
    setChurchSlug(slugify(value));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!churchName.trim()) {
      addToast('Enter your church name.', 'warning');
      return;
    }
    if (logoUrl.trim() && !isHttpUrl(logoUrl.trim())) {
      addToast('Logo must be a public http or https image URL.', 'warning');
      return;
    }
    setSubmitting(true);
    try {
      await sanctumApi.createSpace({
        name: churchName.trim(),
        slug: churchSlug.trim() || slugify(churchName),
        logoUrl: logoUrl.trim() || undefined,
      });
      await refreshAuth();
      addToast('Your Sanctum Space is ready.', 'success');
      onNavigate('/dashboard');
    } catch (error) {
      addToast(error instanceof ApiClientError ? error.message : 'Could not create your Sanctum Space.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const form = (
    <form onSubmit={handleCreate} className="mt-6 space-y-4">
      <div>
        <label className="block text-xs font-bold uppercase text-ink mb-1.5">
          Church name
        </label>
        <input
          type="text"
          required
          value={churchName}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Grace Assembly"
          className="w-full px-4 py-3 rounded-xl border border-line bg-paper/70 dark:bg-paper text-sm font-semibold"
        />
      </div>
      <div>
        <label className="block text-xs font-bold uppercase text-ink mb-1.5">
          Space link
        </label>
        <div className="flex items-center px-4 py-3 rounded-xl border border-line bg-paper/70 dark:bg-paper text-xs font-mono text-muted">
          <span>sanctum.live/</span>
          <input
            type="text"
            value={churchSlug}
            onChange={(e) => setChurchSlug(slugify(e.target.value))}
            className="flex-1 bg-transparent font-bold text-ink focus:outline-none"
          />
        </div>
      </div>
      <LogoUrlField value={logoUrl} onChange={setLogoUrl} />
      <button
        type="submit"
        disabled={submitting}
        className="ui-button w-full gap-2 text-sm disabled:opacity-60"
      >
        {submitting ? 'Creating…' : 'Enter your Sanctum Space'}
        {!submitting && <ArrowRight className="w-4 h-4" />}
      </button>
    </form>
  );

  return (
    <div className="min-h-screen bg-paper flex flex-col p-4 sm:p-6 transition-colors">
      <header className="max-w-xl w-full mx-auto flex items-center justify-between pt-2 pb-6">
        <button type="button" onClick={() => leaveToHome(onNavigate)} className="cursor-pointer">
          <SanctumLogo size="md" showTagline />
        </button>
        <div className="flex items-center gap-2">
          {clerkConfigured && (
            <Show when="signed-in">
              <UserButton afterSignOutUrl="/" />
            </Show>
          )}
          <button
            type="button"
            onClick={toggleDarkMode}
            className="p-2 rounded-xl text-muted hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
          >
            {isDarkMode ? <Sun className="w-5 h-5 text-gold" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>
      </header>

      <main className="max-w-xl w-full mx-auto my-auto bg-card rounded-3xl p-6 sm:p-8 shadow-xl border border-line">
        <div className="w-12 h-12 rounded-2xl bg-green/10 text-green dark:bg-gold/15 dark:text-gold flex items-center justify-center mb-4">
          <Building className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-ink tracking-tight">
          Create your Sanctum Space
        </h1>
        <p className="text-sm text-muted mt-2 leading-relaxed">
          You will be the Owner. Invite Admins later to help run prayer rooms. Congregation still joins with a name — no
          account.
        </p>

        {!clerkConfigured && (
          <div className="mt-6 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium">
            Add Clerk keys to sign in and create a Sanctum Space.
          </div>
        )}

        {clerkConfigured && (
          <>
            <Show when="signed-out">
              <div className="mt-6">
                <SignInButton mode="modal" forceRedirectUrl="/onboarding">
                  <button
                    type="button"
                    className="ui-button w-full text-sm"
                  >
                    Sign in to continue
                  </button>
                </SignInButton>
              </div>
            </Show>
            <Show when="signed-in">
              {isAuthenticated ? (
                <button
                  type="button"
                  onClick={() => onNavigate('/dashboard')}
                  className="ui-button mt-6 w-full gap-2 text-sm"
                >
                  Enter your Sanctum Space
                  <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                form
              )}
            </Show>
          </>
        )}
      </main>
    </div>
  );
};
