import type { MemberPageKey } from '../../../shared/churchSetup.ts';

const TOKEN_KEY = 'church_member_token';

export function memberToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setMemberToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // Private browsing: the member stays signed in for this page only.
  }
}

export class MemberApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const token = memberToken();
  const response = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = body?.details?.fieldErrors as Record<string, string> | undefined;
    throw new MemberApiError((fieldErrors && Object.values(fieldErrors)[0]) || body?.message || 'Something went wrong. Please try again.', response.status);
  }
  return body as T;
}

export interface MemberChurch {
  name: string;
  slug: string;
  logoUrl: string | null;
  phone: string | null;
  timezone: string;
  theme: { primary: string; primaryDark: string; accent: string; accentSoft: string };
  terminology: Record<string, string>;
  features: Record<string, boolean>;
}

export interface MemberHome {
  church: MemberChurch;
  pages: Record<MemberPageKey, boolean>;
  canEditProfile: boolean;
  member: { firstName: string; lastName: string; phone?: string | null; email?: string | null; birthMonthDay?: string | null; status?: string; joinedAt?: string | null };
  household: { name: string; members: { id: string; name: string; isYou: boolean }[] } | null;
  groups: {
    id: string;
    name: string;
    role: string;
    meetingTime: string | null;
    description: string | null;
    huddle: { name: string; slug: string; status: 'LIVE' | 'WAITING' | 'SCHEDULED'; nextStartsAt: string | null } | null;
  }[];
  events: { id: string; title: string; startsAt: string; endsAt: string; location: string; rsvpEnabled: boolean; myRsvp: number }[];
  prayers: { id: string; message: string | null; status: string; createdAt: string }[];
}

export const memberApi = {
  me: () => call<MemberHome>('/api/member/me'),
  updateProfile: (input: { phone?: string; email?: string; birthMonthDay?: string }) =>
    call<{ saved: true }>('/api/member/me', { method: 'PATCH', body: JSON.stringify(input) }),
  rsvp: (eventId: string, count: number) =>
    call<{ saved: true }>(`/api/member/events/${encodeURIComponent(eventId)}/rsvp`, { method: 'POST', body: JSON.stringify({ count }) }),
  pray: (message: string) => call<{ saved: true }>('/api/member/prayer', { method: 'POST', body: JSON.stringify({ message }) }),
};
