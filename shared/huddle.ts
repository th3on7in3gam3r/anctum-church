const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export const LEADER_UNLINKED_MESSAGE = 'Link this leader to a staff account to let them run huddles';

export type HuddleAccess = 'allow' | 'unlinked' | 'deny';

export function huddleAccess(input: {
  orgRole: string | null | undefined;
  actorUserId: string | null | undefined;
  leaderUserId: string | null | undefined;
}): HuddleAccess {
  if (input.orgRole === 'OWNER' || input.orgRole === 'ADMIN') {
    return input.leaderUserId ? 'allow' : 'unlinked';
  }
  if (input.orgRole === 'PRAYER_LEADER') {
    if (!input.leaderUserId) return 'unlinked';
    return input.leaderUserId === input.actorUserId ? 'allow' : 'deny';
  }
  return 'deny';
}

export function huddleSlugBase(groupName: string): string {
  const stem = groupName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${stem || 'group'}-huddle`;
}

export function nextHuddleSlug(taken: Iterable<string>, groupName: string): string {
  const base = huddleSlugBase(groupName);
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function scheduleFromMeetingTime(meetingTime: string | null | undefined): {
  isRecurring: boolean;
  recurrenceRule: 'WEEKLY' | 'SELECTED_DAYS' | null;
  selectedDays: string[];
  scheduledStart: string | null;
} {
  const text = (meetingTime || '').trim();
  if (!text) {
    return { isRecurring: false, recurrenceRule: null, selectedDays: [], scheduledStart: null };
  }
  const selectedDays = WEEKDAYS.filter((day) => new RegExp(day, 'i').test(text));
  const time = text.match(/(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?/i);
  let scheduledStart: string | null = null;
  if (time) {
    let hour = Number(time[1]);
    const minute = (time[2] || '00').padStart(2, '0');
    const marker = (time[3] || '').toLowerCase();
    let period: 'AM' | 'PM' = marker.startsWith('p') ? 'PM' : marker.startsWith('a') ? 'AM' : hour >= 12 ? 'PM' : 'AM';
    if (!marker && hour > 12) {
      hour -= 12;
      period = 'PM';
    }
    if (hour === 0) hour = 12;
    if (hour > 12) hour -= 12;
    scheduledStart = `${String(hour).padStart(2, '0')}:${minute} ${period}`;
  }
  return {
    isRecurring: selectedDays.length > 0,
    recurrenceRule: selectedDays.length > 1 ? 'SELECTED_DAYS' : selectedDays.length === 1 ? 'WEEKLY' : null,
    selectedDays: [...selectedDays],
    scheduledStart,
  };
}

export function memberJoinName(member: { firstName?: string | null; lastName?: string | null } | null | undefined): string {
  if (!member) return '';
  return [member.firstName, member.lastName]
    .map((part) => (part || '').trim())
    .filter(Boolean)
    .join(' ');
}

export function joinDisplayName(input: {
  signedIn: boolean;
  memberName?: string | null;
  typedName?: string | null;
}): string {
  if (input.signedIn) {
    const member = (input.memberName || '').trim();
    if (member) return member;
  }
  return (input.typedName || '').trim();
}

export type PublicLiveRoom = {
  name: string;
  slug: string;
  kind: 'CORPORATE' | 'HUDDLE';
  groupName: string | null;
  listenerCount: number;
  status: 'LIVE' | 'WAITING';
};

export function publicLiveRooms(
  rows: Array<{
    name: string;
    slug: string;
    kind?: string | null;
    groupName?: string | null;
    listenerCount?: number | null;
    status?: string | null;
    guestName?: string | null;
    email?: string | null;
    phone?: string | null;
    userId?: string | null;
    realtimeIdentity?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }>
): PublicLiveRoom[] {
  return rows
    .filter((row) => row.status === 'LIVE' || row.status === 'WAITING')
    .map((row) => ({
      name: row.name,
      slug: row.slug,
      kind: row.kind === 'HUDDLE' ? 'HUDDLE' : 'CORPORATE',
      groupName: row.groupName?.trim() || null,
      listenerCount: Math.max(0, Number(row.listenerCount) || 0),
      status: row.status === 'LIVE' ? 'LIVE' : 'WAITING',
    }));
}

export function churchWordmark(name: string, timeZone?: string | null): { title: string; place: string } {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const city =
    !timeZone || timeZone.endsWith('Kampala')
      ? 'Kampala'
      : (timeZone.split('/').pop() || '').replace(/_/g, ' ');
  if (words.length >= 3) {
    const splitAt = Math.ceil(words.length / 2);
    return {
      title: words.slice(0, splitAt).join(' '),
      place: `${words.slice(splitAt).join(' ')} · ${city}`,
    };
  }
  return { title: words.join(' '), place: city };
}
