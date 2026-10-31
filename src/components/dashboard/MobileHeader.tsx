import React, { useState } from 'react';
import { StaffBrand } from './StaffBrand';
import { churchSiteUrl, isChurchMode } from '../../lib/appMode';
import { UserButton } from '@clerk/react';
import { useAuth } from '../../context/AuthContext';
import { Menu, X, Sun, Moon, LogOut, CircleHelp } from 'lucide-react';
import { staffNav } from '../../lib/staffNav';
import { DemoRoleSwitcher } from './DemoRoleSwitcher';
import { useApp } from '../../context/AppContext';
import { PrayerRoomShortcuts } from './PrayerRoomShortcuts';
import { cn } from '../../lib/utils';

interface MobileHeaderProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onShowTutorial?: () => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  currentPath,
  onNavigate,
  onShowTutorial,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const { organization, user, logout, access, features, clerkConfigured, demo } = useAuth();
  const { isDarkMode, toggleDarkMode } = useApp();

  const items = staffNav(access, features).flatMap((section) => section.items);

  const handleNav = (path: string) => {
    onNavigate(path);
    setIsOpen(false);
  };

  return (
    <>
      <header className="staff-sidebar md:hidden flex items-center justify-between p-4 bg-card border-b border-line sticky top-0 z-40">
        <StaffBrand size="sm" />
        <div className="flex items-center gap-2">
          {clerkConfigured ? <UserButton afterSignOutUrl={isChurchMode() ? churchSiteUrl() : '/'} /> : null}
          <button
            onClick={toggleDarkMode}
            aria-label="Toggle theme"
            className="p-2 rounded-xl text-muted"
          >
            {isDarkMode ? <Sun className="w-4 h-4 text-gold" /> : <Moon className="w-4 h-4" />}
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
            className="p-2 rounded-xl text-ink hover:bg-black/5 dark:hover:bg-white/5"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </header>

      {/* Slide-out mobile drawer */}
      {isOpen && (
        <div className="staff-sidebar md:hidden fixed inset-0 z-50 flex flex-col justify-between p-6">
          <div>
            <div className="flex items-center justify-between pb-6 border-b border-white/15">
              <StaffBrand />
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="mt-4 p-3 rounded-2xl bg-black/5 dark:bg-white/5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-muted">
                {isChurchMode() ? 'Church' : 'Sanctum Space'}
              </p>
              <p className="text-xs font-bold text-ink">{organization.name}</p>
              <p className="text-[11px] text-muted">Logged in as {user?.name}{access ? ` · ${access.roleName}` : ''}</p>
            </div>
            {demo.enabled ? <div className="mt-3"><DemoRoleSwitcher /></div> : null}

            <nav className="mt-6 space-y-1.5">
              {items.map((item) => {
                const Icon = item.icon;
                const isActive = item.path === '/dashboard' || item.path === '/dashboard/church'
                  ? currentPath === item.path
                  : currentPath.startsWith(item.path);
                return (
                  <React.Fragment key={item.path}>
                    <button
                      onClick={() => handleNav(item.path)}
                      className={cn(
                        'w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-base font-semibold transition-colors text-left',
                        isActive
                          ? 'ui-nav-active'
                          : 'text-muted hover:bg-black/5 dark:hover:bg-white/5'
                      )}
                    >
                      <Icon className="w-5 h-5" />
                      <span>{item.label}</span>
                    </button>
                    {item.path === '/dashboard/prayer-rooms' ? (
                      <PrayerRoomShortcuts
                        onNavigate={(path) => {
                          onNavigate(path);
                          setIsOpen(false);
                        }}
                      />
                    ) : null}
                  </React.Fragment>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-line space-y-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                window.open('/join', '_blank', 'noopener,noreferrer');
              }}
              className="w-full py-3 rounded-2xl text-sm font-bold text-center bg-green/10 text-green dark:bg-gold/10 dark:text-gold"
            >
              Preview Public Join Link
            </button>
            {onShowTutorial && (
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onShowTutorial();
                }}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-muted bg-black/5 dark:bg-white/5"
              >
                <CircleHelp className="w-4 h-4" />
                <span>Pastor walkthrough</span>
              </button>
            )}
            <button
              onClick={() => {
                logout();
                setIsOpen(false);
              }}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-bold text-danger bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
