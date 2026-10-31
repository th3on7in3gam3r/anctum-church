import type { PublicServiceTime } from './api';
import type { ServiceTime } from './home';

const HOME_STRIP = ['Sunday', 'Wednesday Upper Room', 'Friday Intercessors'];

export function clock(time: { startLabel: string; endLabel: string }) {
  return `${time.startLabel}–${time.endLabel}`;
}

export function toCard(time: PublicServiceTime): ServiceTime {
  const detail = [time.homeLabel ? time.name : null, time.place, time.note].filter(Boolean).join('. ');
  return {
    day: time.weekday || (time.cadence === 'DAILY' ? 'Daily' : 'Monthly'),
    time: clock(time),
    name: time.homeLabel || time.name,
    line: detail || time.name,
  };
}

export function homeStrip(times: PublicServiceTime[]) {
  const featured = times.filter((time) => time.showOnHome);
  const labels = featured.map((time) => time.homeLabel || time.name);
  return labels.length ? labels : [...HOME_STRIP];
}

export function cardsFromHome(times: ServiceTime[], labels: readonly string[]) {
  return times.filter((time) => labels.includes(time.name));
}

export type Cadence = 'WEEKLY' | 'DAILY' | 'MONTHLY';

/** One row in the homepage schedule, built from CMS service times or the home page body. */
export type ScheduleItem = {
  key: string;
  cadence: Cadence;
  /** Short day label, e.g. "SUN". Empty for daily and monthly items. */
  day: string;
  name: string;
  /** "10:00 a.m.–12:30 p.m." */
  time: string;
  /** Place and note, e.g. "Church building". */
  detail: string;
  featured: boolean;
  /** "HH:MM" start, for ordering within a day. Empty when unknown. */
  opens: string;
};

const DAY_SHORT: Record<string, string> = {
  sunday: 'SUN', monday: 'MON', tuesday: 'TUE', wednesday: 'WED', thursday: 'THU', friday: 'FRI', saturday: 'SAT',
};

function cadenceOf(value: string): Cadence {
  const v = value.toUpperCase();
  if (v === 'DAILY') return 'DAILY';
  if (v === 'MONTHLY') return 'MONTHLY';
  return 'WEEKLY';
}

function dayShort(day: string | null | undefined) {
  return day ? DAY_SHORT[day.trim().toLowerCase()] ?? day.slice(0, 3).toUpperCase() : '';
}

export function scheduleFromServiceTimes(times: PublicServiceTime[]): ScheduleItem[] {
  return [...times]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((time) => ({
      key: time.id,
      cadence: cadenceOf(time.cadence),
      day: cadenceOf(time.cadence) === 'WEEKLY' ? dayShort(time.weekday) : '',
      name: time.name,
      time: clock(time),
      detail: [time.place, time.note].filter(Boolean).join('. ').replace(/\.\./g, '.'),
      featured: time.showOnHome,
      opens: time.opens,
    }));
}

/** Fallback when the service-times table is empty: the "Service times" paragraphs on the home page. */
export function scheduleFromHome(times: ServiceTime[], featuredLabels: readonly string[] = HOME_STRIP): ScheduleItem[] {
  return times.map((time, index) => {
    const cadence = cadenceOf(time.day);
    return {
      key: `${time.name}-${index}`,
      cadence,
      day: cadence === 'WEEKLY' ? dayShort(time.day) : '',
      name: time.name,
      time: time.time,
      detail: time.line === time.time ? '' : time.line,
      featured: featuredLabels.includes(time.name),
      opens: '',
    };
  });
}

const WEEK_ORDER = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function groupSchedule(items: ScheduleItem[]) {
  const weekly = items
    .filter((item) => item.cadence === 'WEEKLY')
    .map((item, index) => ({ item, index }))
    .sort((a, b) => (WEEK_ORDER.indexOf(a.item.day) - WEEK_ORDER.indexOf(b.item.day))
      || (a.item.opens && b.item.opens ? a.item.opens.localeCompare(b.item.opens) : 0)
      || a.index - b.index)
    .map(({ item }) => item);
  return {
    weekly,
    daily: items.filter((item) => item.cadence === 'DAILY'),
    monthly: items.filter((item) => item.cadence === 'MONTHLY'),
  };
}
