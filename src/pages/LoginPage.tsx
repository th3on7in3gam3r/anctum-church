import React from 'react';
import { DemoSignIn } from '../components/common/DemoSignIn';
import { SanctumLogo } from '../components/common/SanctumLogo';
import { sanctumTheme } from '../components/public/ChurchWordmark';
import { StaffBrand } from '../components/dashboard/StaffBrand';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Show, SignIn, UserButton } from '@clerk/react';
import { Sun, Moon } from 'lucide-react';
import { churchSiteUrl, isChurchMode, leaveToHome } from '../lib/appMode';

interface LoginPageProps {
  onNavigate: (path: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onNavigate }) => {
  const { clerkConfigured, membershipDenied, needsOnboarding, demo } = useAuth();
  const { isDarkMode, toggleDarkMode } = useApp();
  const church = isChurchMode();
  const site = churchSiteUrl();
  const theme = sanctumTheme(isDarkMode);

  return (
    <div data-staff data-staff-theme={theme} className="staff-sign-in relative flex min-h-screen flex-col items-center justify-center px-4 py-16 transition-colors">
      <div className="absolute right-4 top-4 flex items-center gap-2 sm:right-6 sm:top-6">
        {clerkConfigured && (
          <Show when="signed-in">
            <UserButton afterSignOutUrl={church ? site : '/'} />
          </Show>
        )}
        <button
          type="button"
          onClick={toggleDarkMode}
          className="cursor-pointer rounded-full border p-2 text-ink"
          style={{ borderColor: 'var(--border-color)' }}
          aria-label={isDarkMode ? 'Switch to light' : 'Switch to dusk'}
        >
          {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      <main className="ui-card w-full max-w-[26.5rem] rounded-[26px] px-6 py-8 shadow-[0_24px_70px_rgba(8,16,12,0.28)] sm:px-8 sm:py-10">
        <div className="mb-6 flex justify-center">
          {church ? (
            <StaffBrand size="md" />
          ) : (
            <button type="button" onClick={() => leaveToHome(onNavigate)} className="cursor-pointer">
              <SanctumLogo size="md" showTagline />
            </button>
          )}
        </div>

        <div className="mb-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Staff</p>
          <h1 className="mt-2 font-display text-[2rem] leading-none text-ink">Sign in</h1>
          <p className="mx-auto mt-3 max-w-[18rem] text-sm leading-relaxed text-muted">
            {church
              ? 'Prayer, the gallery, and the church dashboard.'
              : 'Create a Sanctum Space or join one you were invited to. Congregants join with a prayer link and their name. No account on the join page.'}
          </p>
        </div>

        {demo.enabled ? <DemoSignIn onSignedIn={() => onNavigate('/dashboard')} /> : null}

        {!clerkConfigured && !demo.enabled && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-900 dark:text-amber-200 text-xs font-medium">
            Add VITE_CLERK_PUBLISHABLE_KEY and CLERK_SECRET_KEY, then sign in to create your Sanctum Space.
          </div>
        )}

        {needsOnboarding && (
          <div className="space-y-3">
            <p className="text-xs text-muted leading-relaxed">
              You are signed in. Name your church to open your Sanctum Space.
            </p>
            <button
              type="button"
              onClick={() => onNavigate('/onboarding')}
              className="ui-button w-full"
            >
              Create your Sanctum Space
            </button>
          </div>
        )}

        {membershipDenied && !needsOnboarding && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-danger/30 text-danger text-xs font-medium leading-relaxed">
            Sign in failed. Try again, or ask the space Owner to invite your email as Admin.
          </div>
        )}

        {clerkConfigured && !membershipDenied && !needsOnboarding && (
          <div className="flex justify-center">
            <SignIn
              routing="hash"
              forceRedirectUrl="/onboarding"
              appearance={{
                variables: {
                  colorPrimary: '#C9A35A',
                  colorPrimaryForeground: '#16251F',
                  colorBackground: 'transparent',
                  colorForeground: isDarkMode ? '#F6F1E6' : '#16251F',
                  colorInput: isDarkMode ? '#10241C' : '#F5F1E8',
                  colorInputForeground: isDarkMode ? '#F6F1E6' : '#16251F',
                  borderRadius: '999px',
                },
                elements: {
                  rootBox: 'staff-clerk-root',
                  cardBox: 'staff-clerk-card-box',
                  card: 'staff-clerk-card',
                  badge: 'staff-clerk-badge',
                  lastAuthenticationStrategyBadge: 'staff-last-used',
                },
              }}
            />
          </div>
        )}
      </main>

      <footer className="mt-6 w-full max-w-[26.5rem] space-y-2 text-center text-xs text-muted">
        {church ? (
          <a href={site} className="font-semibold text-ink hover:underline">Back to the website</a>
        ) : (
          <p>
            Starting a church prayer space?{' '}
            <button
              type="button"
              onClick={() => onNavigate('/onboarding')}
              className="font-bold text-ink hover:underline"
            >
              Create a Sanctum Space
            </button>
          </p>
        )}
        <p>Powered by Sanctum Live</p>
      </footer>
    </div>
  );
};
