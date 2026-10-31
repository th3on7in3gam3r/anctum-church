/** Wall-clock label for the next gathering, in the room's timezone. Example: "Wednesday · 6:00 p.m." */
export function formatGatheringTime(date: Date, timeZone: string): string {
  const zone = timeZone.trim() || 'Africa/Kampala';
  const weekday = new Intl.DateTimeFormat('en-US', { timeZone: zone, weekday: 'long' }).format(date);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value || '';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  const period = (parts.find((part) => part.type === 'dayPeriod')?.value || '').toLowerCase();
  const suffix = period.startsWith('a') ? 'a.m.' : 'p.m.';
  return `${weekday} · ${hour}:${minute} ${suffix}`;
}

/** Secondary church line. Hidden when it repeats the room name or the API sent no name. */
export function visibleOrganizationName(roomName: string, organizationName: string | null | undefined): string {
  const organization = (organizationName || '').trim();
  if (!organization) return '';
  if (organization.toLowerCase() === roomName.trim().toLowerCase()) return '';
  return organization;
}

/** Session leader, then the room's default leader, then the church default. */
export function resolveSermonLeader(
  sessionName: string | null | undefined,
  roomLeader?: string | null | undefined,
  defaultSpeaker?: string | null | undefined
): string {
  for (const name of [sessionName, roomLeader, defaultSpeaker]) {
    const trimmed = (name || '').trim();
    if (trimmed) return trimmed;
  }
  return '';
}

/** WAITING and LIVE gatherings are open. Otherwise show the next occurrence, never a created-at stamp. */
export function joinScheduleLabel(status: string, nextOccurrence: Date | undefined, timeZone: string): string {
  if (status === 'WAITING' || status === 'LIVE') return 'Open now';
  if (!nextOccurrence || Number.isNaN(nextOccurrence.getTime())) return '';
  return formatGatheringTime(nextOccurrence, timeZone);
}
