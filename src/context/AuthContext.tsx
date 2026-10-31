import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth as useClerkAuth } from '@clerk/react';
import { Organization, User, Role } from '../types';
import { SEED_ORGANIZATION } from '../data/seedData';
import { setCmsAccessTokenGetter } from '../services/api/cmsApi';
import { ApiClientError, sanctumApi, setApiAccessTokenGetter } from '../services/api/sanctumApi';
import { demoApi } from '../services/api/setupApi';
import { applyBrandTheme } from '../lib/brandTheme';
import { effectiveFeatures, type ChurchAccess, type FeatureKey } from '../../shared/churchSetup.ts';

interface AuthContextType {
  user: User | null;
  organization: Organization;
  isAuthenticated: boolean;
  authReady: boolean;
  membershipDenied: boolean;
  needsOnboarding: boolean;
  clerkConfigured: boolean;
  login: (email: string, role?: Role) => boolean;
  logout: () => void;
  refreshAuth: () => Promise<void>;
  switchOrganization: (org: Organization) => void;
  updateOrganization: (updates: Partial<Organization>) => void;
  /** The person's church role and area levels. */
  access: ChurchAccess | null;
  /** What the church has switched on. */
  features: Record<FeatureKey, boolean>;
  demo: { enabled: boolean; signInAs: (persona: string) => Promise<void> };
}

const DEFAULT_FEATURES = effectiveFeatures(null);
const NO_DEMO = { enabled: false, signInAs: async () => undefined };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapOrganization(row: Record<string, unknown> | null): Organization {
  if (!row) return SEED_ORGANIZATION;
  return {
    ...SEED_ORGANIZATION,
    id: String(row.id || SEED_ORGANIZATION.id),
    name: typeof row.name === 'string' ? row.name : '',
    slug: String(row.slug || SEED_ORGANIZATION.slug),
    logoUrl: typeof row.logoUrl === 'string' ? row.logoUrl : undefined,
    country: String(row.country || SEED_ORGANIZATION.country),
    timezone: String(row.timezone || SEED_ORGANIZATION.timezone),
    website: typeof row.website === 'string' ? row.website : SEED_ORGANIZATION.website,
    joinPageMessage:
      typeof row.joinPageMessage === 'string' ? row.joinPageMessage : SEED_ORGANIZATION.joinPageMessage,
    accentColor: typeof row.accentColor === 'string' ? row.accentColor : SEED_ORGANIZATION.accentColor,
    youtubeChannelId: typeof row.youtubeChannelId === 'string' ? row.youtubeChannelId : undefined,
    youtubeChannelInput: typeof row.youtubeChannelInput === 'string' ? row.youtubeChannelInput : undefined,
    defaultSermonSpeaker: typeof row.defaultSermonSpeaker === 'string' ? row.defaultSermonSpeaker : '',
    speakerAliases: Array.isArray(row.speakerAliases) ? row.speakerAliases.filter((alias): alias is string => typeof alias === 'string') : [],
    appName: typeof row.appName === 'string' ? row.appName : undefined,
    brandTheme: typeof row.brandTheme === 'string' ? row.brandTheme : undefined,
    terminology:
      row.terminology && typeof row.terminology === 'object' && !Array.isArray(row.terminology)
        ? (row.terminology as Record<string, string>)
        : undefined,
  };
}

function asKnownRole(role: unknown): Role {
  switch (role) {
    case 'OWNER':
    case 'ADMIN':
    case 'PRAYER_LEADER':
    case 'TECHNICAL_ADMIN':
    case 'MEDIA':
    case 'SPEAKER':
    case 'LISTENER':
      return role;
    default:
      return 'LISTENER';
  }
}

const ClerkSyncedAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isLoaded, isSignedIn, getToken, signOut } = useClerkAuth();
  const [organization, setOrganization] = useState<Organization>(SEED_ORGANIZATION);
  const [user, setUser] = useState<User | null>(null);
  const [membershipDenied, setMembershipDenied] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState<ChurchAccess | null>(null);
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURES);

  useEffect(() => applyBrandTheme(organization.brandTheme), [organization.brandTheme]);

  useEffect(() => {
    setApiAccessTokenGetter(() => getToken());
    setCmsAccessTokenGetter(() => getToken());
    return () => {
      setApiAccessTokenGetter(null);
      setCmsAccessTokenGetter(null);
    };
  }, [getToken]);

  const applyMe = useCallback((me: Awaited<ReturnType<typeof sanctumApi.fetchMe>>) => {
    if (me.needsOnboarding || !me.user?.role || !me.user.organizationId || !me.organization) {
      setUser(null);
      setNeedsOnboarding(true);
      setMembershipDenied(false);
      return;
    }
    setNeedsOnboarding(false);
    setMembershipDenied(false);
    setUser({
      id: me.user.id,
      organizationId: me.user.organizationId,
      name: me.user.name,
      memberName: me.user.memberName || undefined,
      email: me.user.email,
      role: asKnownRole(me.user.role),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setOrganization(mapOrganization(me.organization));
    setAccess(me.access ?? null);
    setFeatures(me.features ?? DEFAULT_FEATURES);
  }, []);

  const syncFromClerk = useCallback(async () => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setUser(null);
      setMembershipDenied(false);
      setNeedsOnboarding(false);
      setAuthReady(true);
      return;
    }
    try {
      let token = await getToken();
      for (let attempt = 0; !token && attempt < 8; attempt += 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        token = await getToken();
      }
      if (!token) {
        setUser(null);
        setMembershipDenied(false);
        setNeedsOnboarding(false);
        setAuthReady(true);
        return;
      }
      const me = await sanctumApi.fetchMe();
      applyMe(me);
    } catch (error) {
      setUser(null);
      setNeedsOnboarding(false);
      setMembershipDenied(error instanceof ApiClientError && error.status === 403);
    } finally {
      setAuthReady(true);
    }
  }, [applyMe, getToken, isLoaded, isSignedIn]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      await syncFromClerk();
      if (cancelled) return;
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [syncFromClerk]);

  const logout = () => {
    setUser(null);
    setNeedsOnboarding(false);
    void signOut({ redirectUrl: '/' });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: Boolean(user),
        authReady,
        membershipDenied,
        needsOnboarding,
        clerkConfigured: true,
        login: () => false,
        logout,
        refreshAuth: syncFromClerk,
        switchOrganization: setOrganization,
        updateOrganization: (updates) =>
          setOrganization((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() })),
        access,
        features,
        demo: NO_DEMO,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const LocalAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization>(SEED_ORGANIZATION);
  return (
    <AuthContext.Provider
      value={{
        user: null,
        organization,
        isAuthenticated: false,
        authReady: true,
        membershipDenied: false,
        needsOnboarding: false,
        clerkConfigured: false,
        login: () => false,
        logout: () => undefined,
        refreshAuth: async () => undefined,
        switchOrganization: setOrganization,
        updateOrganization: (updates) =>
          setOrganization((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() })),
        access: null,
        features: DEFAULT_FEATURES,
        demo: NO_DEMO,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

const DEMO_TOKEN_KEY = 'church_demo_token';

function readDemoToken(): string | null {
  try {
    return localStorage.getItem(DEMO_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * Demo sign-in: no accounts. Pick a person from the sample church and the server hands back
 * a signed demo token. Used only when the build sets VITE_DEMO_MODE=true.
 */
const DemoAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [organization, setOrganization] = useState<Organization>(SEED_ORGANIZATION);
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [access, setAccess] = useState<ChurchAccess | null>(null);
  const [features, setFeatures] = useState<Record<FeatureKey, boolean>>(DEFAULT_FEATURES);

  useEffect(() => applyBrandTheme(organization.brandTheme), [organization.brandTheme]);

  useEffect(() => {
    const getter = async () => readDemoToken();
    setApiAccessTokenGetter(getter);
    setCmsAccessTokenGetter(getter);
    return () => {
      setApiAccessTokenGetter(null);
      setCmsAccessTokenGetter(null);
    };
  }, []);

  const refresh = useCallback(async () => {
    if (!readDemoToken()) {
      setUser(null);
      setAccess(null);
      setAuthReady(true);
      return;
    }
    try {
      const me = await sanctumApi.fetchMe();
      if (!me.user?.role || !me.user.organizationId || !me.organization) {
        setUser(null);
        setAccess(null);
        return;
      }
      setUser({
        id: me.user.id,
        organizationId: me.user.organizationId,
        name: me.user.name,
        memberName: me.user.memberName || undefined,
        email: me.user.email,
        role: asKnownRole(me.user.role),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setOrganization(mapOrganization(me.organization));
      setAccess(me.access ?? null);
      setFeatures(me.features ?? DEFAULT_FEATURES);
    } catch {
      localStorage.removeItem(DEMO_TOKEN_KEY);
      setUser(null);
      setAccess(null);
    } finally {
      setAuthReady(true);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const signInAs = useCallback(
    async (persona: string) => {
      const token = await demoApi.login(persona);
      localStorage.setItem(DEMO_TOKEN_KEY, token);
      await refresh();
    },
    [refresh]
  );

  const logout = () => {
    localStorage.removeItem(DEMO_TOKEN_KEY);
    setUser(null);
    setAccess(null);
    window.location.assign('/login');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organization,
        isAuthenticated: Boolean(user),
        authReady,
        membershipDenied: false,
        needsOnboarding: false,
        clerkConfigured: false,
        login: () => false,
        logout,
        refreshAuth: refresh,
        switchOrganization: setOrganization,
        updateOrganization: (updates) =>
          setOrganization((prev) => ({ ...prev, ...updates, updatedAt: new Date().toISOString() })),
        access,
        features,
        demo: { enabled: true, signInAs },
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  if (import.meta.env.VITE_DEMO_MODE === 'true') {
    return <DemoAuthProvider>{children}</DemoAuthProvider>;
  }
  if (!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }
  return <ClerkSyncedAuthProvider>{children}</ClerkSyncedAuthProvider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
