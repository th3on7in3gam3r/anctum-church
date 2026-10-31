export function publishedOnly<T extends { isPublished: boolean }>(rows: T[]): T[] {
  return rows.filter((row) => row.isPublished);
}

export function currentAnnouncements<T extends { startsAt: Date | string; endsAt?: Date | string | null; isPinned?: boolean }>(
  rows: T[],
  now = new Date()
): T[] {
  const time = now.getTime();
  return rows
    .filter((row) => {
      const start = new Date(row.startsAt).getTime();
      const end = row.endsAt ? new Date(row.endsAt).getTime() : null;
      return start <= time && (end === null || end >= time);
    })
    .sort((a, b) => Number(Boolean(b.isPinned)) - Number(Boolean(a.isPinned)));
}

export function upcomingEvents<T extends { startsAt: Date | string }>(rows: T[], now = new Date()): T[] {
  const time = now.getTime();
  return rows
    .filter((row) => new Date(row.startsAt).getTime() > time)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
}
