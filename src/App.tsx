import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { OnboardingPage } from './pages/OnboardingPage';
import { DashboardOverviewPage } from './pages/DashboardOverviewPage';
import { PrayerRoomsListPage } from './pages/PrayerRoomsListPage';
import { PrayerRoomDetailsPage } from './pages/PrayerRoomDetailsPage';
import { CreatePrayerRoomPage } from './pages/CreatePrayerRoomPage';
import { PrayerControlRoomPage } from './pages/PrayerControlRoomPage';
import { PrayerRequestsPage } from './pages/PrayerRequestsPage';
import { ParticipantsPage } from './pages/ParticipantsPage';
import { HistoryPage } from './pages/HistoryPage';
import { SettingsPage } from './pages/SettingsPage';
import { MembersPage } from './pages/cms/MembersPage';
import { HouseholdsPage } from './pages/cms/HouseholdsPage';
import { GroupsPage } from './pages/cms/GroupsPage';
import { VisitorsPage } from './pages/cms/VisitorsPage';
import { EventsPage } from './pages/cms/EventsPage';
import { SermonsPage } from './pages/cms/SermonsPage';
import { AnnouncementsPage } from './pages/cms/AnnouncementsPage';
import { PagesPage } from './pages/cms/PagesPage';
import { ChurchOverviewPage } from './pages/cms/ChurchOverviewPage';
import { FaqsPage } from './pages/cms/FaqsPage';
import { LeadersPage } from './pages/cms/LeadersPage';
import { GalleryPage } from './pages/cms/GalleryPage';
import { PrivacyPage } from './pages/PrivacyPage';
import { TermsPage } from './pages/TermsPage';
import { PublicJoinView } from './components/public/PublicJoinView';
import { JoinFinderPage } from './pages/JoinFinderPage';
import { ListenerRoomView } from './components/public/ListenerRoomView';
import { DashboardLayout } from './components/dashboard/DashboardLayout';
import { NotificationToastContainer } from './components/common/NotificationToast';
import { GlobalConfirmModal } from './components/common/GlobalConfirmModal';
import { loadJoinSession } from './services/realtime/joinSessionStore';
import { CHURCH_PUBLIC_NAME, churchSiteUrl, isChurchMode } from './lib/appMode';
import { ChurchSetupPage } from './pages/ChurchSetupPage';
import { NoAccessPanel } from './components/dashboard/NoAccessPanel';
import { navItemAllowed, navItemForPath } from './lib/staffNav';

const RouterContent: React.FC = () => {
  const { isAuthenticated, authReady, membershipDenied, needsOnboarding, user, access, features } = useAuth();
  const { hasUnsavedChanges, setHasUnsavedChanges, confirmAction, leavePrayerRoom } = useApp();

  // Route state
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Attendee state for public join
  const [joinedAttendeeName, setJoinedAttendeeName] = useState<string | null>(() => {
    const storedJoin = loadJoinSession();
    if (!storedJoin) return null;
    return localStorage.getItem('sanctum_active_attendee_session') || storedJoin.guestName || null;
  });

  useEffect(() => {
    const handlePopState = () => {
      const nextPath = window.location.pathname || '/';
      if (hasUnsavedChanges) {
        window.history.pushState({}, '', currentPath);
        confirmAction({
          title: 'Discard unsaved changes?',
          description: 'Your changes have not been saved.',
          confirmText: 'Discard Changes',
          cancelText: 'Stay Here',
          isDestructive: true,
          onConfirm: () => {
            setHasUnsavedChanges(false);
            window.history.pushState({}, '', nextPath);
            setCurrentPath(nextPath);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          },
        });
        return;
      }
      setCurrentPath(nextPath);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [hasUnsavedChanges, currentPath, confirmAction, setHasUnsavedChanges]);

  const navigate = (path: string, options?: { ignoreUnsaved?: boolean }) => {
    const go = () => {
      window.history.pushState({}, '', path);
      setCurrentPath(path);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    if (options?.ignoreUnsaved) {
      setHasUnsavedChanges(false);
      go();
      return;
    }

    if (hasUnsavedChanges) {
      confirmAction({
        title: 'Discard unsaved changes?',
        description: 'Your changes have not been saved.',
        confirmText: 'Discard Changes',
        cancelText: 'Stay Here',
        isDestructive: true,
        onConfirm: () => {
          setHasUnsavedChanges(false);
          go();
        },
      });
      return;
    }

    go();
  };

  useEffect(() => {
    if (!isChurchMode()) return;
    document.title = CHURCH_PUBLIC_NAME;
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (icon) icon.href = '/brand/icon-32.png';
  }, []);

  useEffect(() => {
    if (!authReady) return;
    const church = isChurchMode();
    if (church && currentPath === '/') return;
    if (needsOnboarding && currentPath !== '/onboarding' && !currentPath.startsWith('/join')) {
      if (
        currentPath === '/' ||
        currentPath === '/login' ||
        currentPath.startsWith('/dashboard')
      ) {
        navigate('/onboarding');
      }
      return;
    }
    if (isAuthenticated && ((!church && currentPath === '/') || currentPath === '/login' || currentPath === '/onboarding')) {
      navigate('/dashboard');
      return;
    }
    if (membershipDenied && currentPath !== '/login' && !currentPath.startsWith('/join')) {
      if (currentPath === '/' || currentPath.startsWith('/dashboard') || currentPath === '/onboarding') {
        navigate('/login');
      }
    }
  }, [authReady, isAuthenticated, membershipDenied, needsOnboarding, currentPath]);

  // Route: /join (paste a link) or /join/:slug (that room)
  if (currentPath === '/join' || currentPath === '/join/') {
    return <JoinFinderPage onNavigate={navigate} />;
  }

  if (currentPath.startsWith('/join/')) {
    const parts = currentPath.split('/');
    const slug = parts[2];
    if (!slug) {
      return <JoinFinderPage onNavigate={navigate} />;
    }

    if (joinedAttendeeName) {
      return (
          <ListenerRoomView
          participantName={joinedAttendeeName}
          roomSlug={slug}
          onLeave={() => {
            void leavePrayerRoom();
            localStorage.removeItem('sanctum_active_attendee_session');
            setJoinedAttendeeName(null);
            navigate(isAuthenticated ? '/dashboard' : `/join/${slug}`);
          }}
        />
      );
    }

    return (
      <PublicJoinView
        slug={slug}
        onJoinSuccess={(name) => {
          localStorage.setItem('sanctum_active_attendee_session', name);
          setJoinedAttendeeName(name);
        }}
        onNavigate={navigate}
      />
    );
  }

  // Standalone Public Pages
  if (currentPath === '/login') {
    return <LoginPage onNavigate={navigate} />;
  }
  if (currentPath === '/onboarding') {
    if (!authReady) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-muted">
          Checking church session…
        </div>
      );
    }
    return <OnboardingPage onNavigate={navigate} />;
  }
  if (currentPath === '/privacy') {
    return <PrivacyPage onNavigate={navigate} />;
  }
  if (currentPath === '/terms') {
    return <TermsPage onNavigate={navigate} />;
  }
  if (currentPath === '/') {
    if (import.meta.env.VITE_DEMO_MODE === 'true') return <LoginPage onNavigate={navigate} />;
    if (isChurchMode()) return <ChurchHomeRedirect />;
    return <LandingPage onNavigate={navigate} />;
  }

  if (currentPath.startsWith('/dashboard')) {
    if (!authReady) {
      return (
        <div className="min-h-screen bg-paper flex items-center justify-center text-sm text-muted">
          Checking church session…
        </div>
      );
    }
    if (needsOnboarding) {
      return <OnboardingPage onNavigate={navigate} />;
    }
    if (!isAuthenticated) {
      return <LoginPage onNavigate={navigate} />;
    }
    const owner = navItemForPath(currentPath.split('?')[0]);
    if (access && owner && !navItemAllowed(owner, access, features)) {
      const featureOff = owner.feature ? !features[owner.feature] : false;
      return (
        <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
          <NoAccessPanel featureOff={featureOff} label={owner.label} roleName={access.roleName} onNavigate={navigate} />
        </DashboardLayout>
      );
    }
    if (currentPath === '/dashboard/setup') {
      return (
        <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
          <ChurchSetupPage />
        </DashboardLayout>
      );
    }
    if (!access && user?.role === 'MEDIA' && !currentPath.startsWith('/dashboard/gallery')) {
      return (
        <DashboardLayout currentPath="/dashboard/gallery" onNavigate={navigate}>
          <GalleryPage review={false} />
        </DashboardLayout>
      );
    }
  }
  if (currentPath.includes('/control')) {
    const parts = currentPath.split('/');
    const roomId = parts[3] || 'room_1';

    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <PrayerControlRoomPage roomId={roomId} onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  // Dashboard Create/Edit route: /dashboard/prayer-rooms/new or /dashboard/prayer-rooms/:id/edit
  if (currentPath === '/dashboard/prayer-rooms/new') {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <CreatePrayerRoomPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (currentPath.includes('/edit')) {
    const parts = currentPath.split('/');
    const roomId = parts[3];
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <CreatePrayerRoomPage roomId={roomId} onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  const pathOnly = currentPath.split('?')[0];
  const showSharePanel = new URLSearchParams(currentPath.split('?')[1] || '').get('share') === '1';
  const roomDetailMatch = pathOnly.match(/^\/dashboard\/prayer-rooms\/([^/]+)$/);
  if (roomDetailMatch) {
    return (
      <DashboardLayout currentPath={pathOnly} onNavigate={navigate}>
        <PrayerRoomDetailsPage roomId={roomDetailMatch[1]} onNavigate={navigate} showSharePanel={showSharePanel} />
      </DashboardLayout>
    );
  }

  // Dashboard sub-routes
  if (currentPath === '/dashboard/prayer-rooms') {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <PrayerRoomsListPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (currentPath === '/dashboard/prayer-requests') {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <PrayerRequestsPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (currentPath === '/dashboard/participants') {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <ParticipantsPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (currentPath === '/dashboard/history') {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <HistoryPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (currentPath === '/dashboard/settings') {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <SettingsPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (currentPath.startsWith('/dashboard/gallery')) {
    return (
      <DashboardLayout currentPath="/dashboard/gallery" onNavigate={navigate}>
        <GalleryPage review={currentPath.startsWith('/dashboard/gallery/review')} />
      </DashboardLayout>
    );
  }

  const churchPages: Record<string, React.ReactNode> = {
    '/dashboard/church': <ChurchOverviewPage />,
    '/dashboard/church/members': <MembersPage />,
    '/dashboard/church/households': <HouseholdsPage />,
    '/dashboard/church/groups': <GroupsPage />,
    '/dashboard/church/leaders': <LeadersPage />,
    '/dashboard/church/faqs': <FaqsPage />,
    '/dashboard/church/visitors': <VisitorsPage />,
    '/dashboard/church/events': <EventsPage />,
    '/dashboard/church/sermons': <SermonsPage />,
    '/dashboard/church/announcements': <AnnouncementsPage />,
    '/dashboard/church/pages': <PagesPage />,
  };
  if (churchPages[currentPath]) {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        {churchPages[currentPath]}
      </DashboardLayout>
    );
  }

  // Default Dashboard Overview
  if (currentPath.startsWith('/dashboard')) {
    return (
      <DashboardLayout currentPath={currentPath} onNavigate={navigate}>
        <DashboardOverviewPage onNavigate={navigate} />
      </DashboardLayout>
    );
  }

  if (isChurchMode()) return <ChurchHomeRedirect />;
  return <LandingPage onNavigate={navigate} />;
};

function ChurchHomeRedirect() {
  useEffect(() => {
    window.location.replace(churchSiteUrl());
  }, []);
  return null;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: Error | null }> {
  declare props: { children: React.ReactNode };
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="min-h-screen bg-paper text-ink flex flex-col items-center justify-center gap-6 px-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.22em] text-gold">Sanctum</p>
        <h1 className="text-2xl font-semibold">Something went wrong — reload</h1>
        <button
          type="button"
          className="px-5 py-3 rounded-xl bg-green text-white font-semibold cursor-pointer"
          onClick={() => window.location.reload()}
        >
          Reload
        </button>
      </div>
    );
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AuthProvider>
        <AppProvider>
          <RouterContent />
          <NotificationToastContainer />
          <GlobalConfirmModal />
        </AppProvider>
      </AuthProvider>
    </AppErrorBoundary>
  );
}
