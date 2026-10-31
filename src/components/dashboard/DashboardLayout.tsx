import React from 'react';
import { DashboardSidebar } from './DashboardSidebar';
import { MobileHeader } from './MobileHeader';
import { AdminHelpChatWidget } from './AdminHelpChatWidget';
import { usePastorJourney } from '../../hooks/usePastorJourney';
import { isPastorJourneyActive } from '../../tour/pastorJourney/storage';
import { useApp } from '../../context/AppContext';
import { sanctumTheme } from '../public/ChurchWordmark';

interface DashboardLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPath,
  onNavigate,
  children,
}) => {
  const { isDarkMode } = useApp();
  const { startPastorJourney } = usePastorJourney(currentPath, onNavigate, {
    enabled: !currentPath.includes('/edit'),
    delayMs: 800,
  });

  const handleShowTutorial = () => {
    startPastorJourney();
  };

  return (
    <div
      data-staff
      data-staff-theme={sanctumTheme(isDarkMode)}
      data-control={currentPath.includes('/control') ? 'true' : undefined}
      className="flex min-h-screen flex-col bg-paper transition-colors md:flex-row"
    >
      {/* Desktop Sidebar */}
      <DashboardSidebar
        currentPath={currentPath}
        onNavigate={onNavigate}
        onShowTutorial={handleShowTutorial}
        showPastorWalkthrough={isPastorJourneyActive()}
        className="staff-sidebar hidden md:flex"
      />

      {/* Mobile Top Header */}
      <MobileHeader
        currentPath={currentPath}
        onNavigate={onNavigate}
        onShowTutorial={handleShowTutorial}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto max-h-screen">
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 md:p-8">
          {children}
        </main>
        <p className="staff-credit">Powered by Sanctum Live</p>
      </div>

      <AdminHelpChatWidget currentPath={currentPath} />
    </div>
  );
};


